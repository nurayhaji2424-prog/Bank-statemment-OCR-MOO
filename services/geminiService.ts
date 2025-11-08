import { GoogleGenAI, Type, Part } from "@google/genai";
import { Transaction } from '../types';

// Let TypeScript know about the global pdfjsLib object
declare global {
    interface Window {
        ['pdfjs-dist/build/pdf']: any;
        pdfjsLib: any;
    }
}

// Promise to ensure the script is loaded only once.
let pdfjsLibPromise: Promise<any> | null = null;
const PDF_JS_VERSION = '2.16.105';
const PDF_JS_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.min.js`;
const PDF_WORKER_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

const getPdfJs = (): Promise<any> => {
    // Check if the library object already exists on the window.
    const pdfLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (pdfLib) {
        if (!pdfLib.GlobalWorkerOptions.workerSrc) {
             pdfLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN_URL;
        }
        return Promise.resolve(pdfLib);
    }

    // If loading is already in progress, return the existing promise.
    if (pdfjsLibPromise) {
        return pdfjsLibPromise;
    }
    
    // Start loading the script from the specified CDN.
    pdfjsLibPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PDF_JS_CDN_URL;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => {
            // After loading, the library is available on window['pdfjs-dist/build/pdf']
            const pdfLibInstance = window['pdfjs-dist/build/pdf'];
            if (pdfLibInstance) {
                // Configure the worker source once the library is loaded.
                pdfLibInstance.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN_URL;
                // For consistency, we can also assign it to window.pdfjsLib
                window.pdfjsLib = pdfLibInstance;
                resolve(pdfLibInstance);
            } else {
                 reject(new Error('pdf.js loaded but the library object is not found on the window.'));
            }
        };
        script.onerror = () => {
            // Reset promise on failure to allow retries.
            pdfjsLibPromise = null; 
            reject(new Error('PDF processing library failed to load. Please check your network connection and try again.'));
        };
        document.head.appendChild(script);
    });

    return pdfjsLibPromise;
};

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File, setLoadingMessage: (message: string) => void): Promise<Part[]> => {
  if (file.type === "application/pdf") {
    setLoadingMessage(`Loading PDF library for ${file.name}...`);
    const pdfjsLib = await getPdfJs();
    const parts: Part[] = [];
    const fileBuffer = await file.arrayBuffer();
    
    let pdf;
    try {
      setLoadingMessage(`Processing PDF: ${file.name}...`);
      const typedarray = new Uint8Array(fileBuffer);
      pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      throw new Error(`Could not read ${file.name}. It might be corrupted or password-protected.`);
    }

    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      try {
        setLoadingMessage(`Rendering page ${i} of ${numPages} from ${file.name}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
          throw new Error(`Could not create canvas context for page ${i}.`);
        }
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        });
      } catch (error) {
          console.error(`Failed to render page ${i} of the PDF:`, error);
          throw new Error(`An error occurred while rendering page ${i} from ${file.name}. The page might be corrupted.`);
      }
    }
    return parts;
  } else {
    const base64EncodedData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return [
      {
        inlineData: {
          mimeType: file.type,
          data: base64EncodedData,
        },
      },
    ];
  }
};

const cleanAndParseJson = (text: string): Transaction[] => {
    const trimmed = text.trim();
    // In case the API returns the JSON inside a markdown block
    const jsonMatch = trimmed.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : trimmed;
    
    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        throw new Error("Parsed data is not an array.");
    } catch (error) {
        console.error("JSON parsing error:", error);
        throw new Error("The AI returned an invalid data format. Please check the document or try again.");
    }
}

export const processStatementFiles = async (
  files: File[], 
  setLoadingMessage: (message: string) => void
): Promise<Transaction[]> => {
  const allPartsPromises = files.map(file => fileToGenerativePart(file, setLoadingMessage));
  const allPartsArrays = await Promise.all(allPartsPromises);
  const imageParts = allPartsArrays.flat();

  if (imageParts.length === 0) {
    throw new Error("No processable content found in the selected files.");
  }
  
  const prompt = `You are an expert financial data extraction tool. Your task is to analyze the provided image(s) of one or more bank statements and extract all transactional data.

Please adhere to the following rules strictly:
1.  Identify and list every individual transaction from all provided statements.
2.  Combine transactions from all documents into a single, continuous list.
3.  Ignore all non-transactional information such as headers, footers, summary sections, bank contact details, and marketing materials.
4.  For each transaction, extract the required fields.
5.  The final output must be a valid JSON array of objects, where each object represents a single transaction. Do not include any text, explanation, or markdown formatting before or after the JSON array.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: "Transaction date in YYYY-MM-DD format."
        },
        description: {
          type: Type.STRING,
          description: "The full transaction description or title."
        },
        amount: {
          type: Type.NUMBER,
          description: "Transaction amount. Use a negative number for expenses/debits, and a positive number for deposits/credits."
        },
        category: {
          type: Type.STRING,
          description: "A relevant category like 'Groceries', 'Dining', 'Salary', 'Utilities', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Other'."
        },
        notes: {
          type: Type.STRING,
          description: "Any relevant notes if available, otherwise an empty string."
        }
      },
      required: ["date", "description", "amount", "category", "notes"]
    }
  };

  setLoadingMessage('Analyzing transactions with Gemini...');
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [...imageParts, { text: prompt }],
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    setLoadingMessage('Finalizing results...');
    const textResponse = response.text;
    if (!textResponse) {
        throw new Error("Received an empty response from the AI. The document might be unreadable or empty.");
    }
    
    return cleanAndParseJson(textResponse);
  } catch (e) {
      console.error(e);
      if (e instanceof Error) {
          throw e; // Rethrow specific errors from file processing or Gemini
      }
      throw new Error("Failed to process the statement with Gemini. The document might not be a valid bank statement or there was a network issue.");
  }
};
