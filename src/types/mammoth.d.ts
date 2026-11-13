declare module "mammoth" {
  export interface MammothMessage {
    type: string;
    message: string;
  }
  export interface ExtractResult {
    value: string;
    messages: MammothMessage[];
  }
  export function extractRawText(input: { buffer: Buffer }): Promise<ExtractResult>;
  export function extractRawText(input: { path: string }): Promise<ExtractResult>;
  const mammoth: {
    extractRawText: (input: { buffer: Buffer } | { path: string }) => Promise<ExtractResult>;
  };
  export default mammoth;
}
