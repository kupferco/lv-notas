declare module "ngrok" {
  function connect(options: number | {
    proto?: string;
    addr: number;
    auth?: string;
    subdomain?: string;
    authtoken?: string;
    region?: string;
  }): Promise<string>;
  
  function kill(): Promise<void>;
  
  export { connect, kill };
}
