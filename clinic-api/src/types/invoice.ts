// src/types/invoice.ts
export type InvoiceGenerationBody = {
  customerData: {
    name: string;
    document: string;  // e.g. CPF/CNPJ or Tax ID
    email: string;
    address: {
      street: string;
      number: string;
      complement?: string;  // Made optional since it might not always be provided
      neighborhood?: string; // Made optional since it might not always be provided
      city: string;
      state: string;
      zip: string;
      zipCode?: string;  // Alternative name for zip, made optional
      cityCode?: string; // Municipal code, made optional
    };
  };
  serviceData: {
    description: string;
    value: number;
    quantity: number;
    taxRate?: number;
    serviceCode: string;
  };
};