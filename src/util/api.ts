export const api = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  
  if (!response.ok) {
    let errorMessage = `${response.status}: ${response.statusText}`;
    
    try {
      // Try to extract the error message from the response body
      const errorBody = await response.json();
      if (errorBody && errorBody.message) {
        errorMessage += ` - ${errorBody.message}`;
      }
    } catch (error) {
      // If parsing the JSON fails, log the error
      console.error('Failed to parse error response:', error);
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json() as Promise<T>;
};