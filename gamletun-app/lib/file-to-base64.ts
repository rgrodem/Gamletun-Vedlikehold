// Leser en File til ren base64 (uten "data:...;base64,"-prefiks) for sending
// til server-side KI-ruter.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Kunne ikke lese filen'));
    reader.readAsDataURL(file);
  });
}
