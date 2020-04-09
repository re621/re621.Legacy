/**
 * Generic response from the e621 API.  
 * Other responses should extend this for proper typecasting.  
 */
interface APIResponse {
    id: number;
    error: string;
}
