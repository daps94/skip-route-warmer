export const api = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  
  if (!response.ok) {
    let errorMessage = `${response.status}: ${response.statusText}`;
    
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.message) {
        errorMessage += ` - ${errorBody.message}`;
      }
    } catch (error) {
      console.error('Failed to parse error response:', error);
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json() as Promise<T>;
};