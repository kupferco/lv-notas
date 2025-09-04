// // clinic-api/src/services/nfse-invoice-data.ts
// import { InvoiceGenerationBody } from "../types/invoice.js";

// interface InvoiceBuildOptions {
//     therapistConfig: any;
//     session: any;
//     customerData?: Partial<InvoiceGenerationBody["customerData"]>;
//     serviceData?: Partial<InvoiceGenerationBody["serviceData"]>;
// }

// export function buildInvoiceData({
//     therapistConfig,
//     session,
//     customerData = {},
//     serviceData = {}
// }: InvoiceBuildOptions) {
//     // Build company data from individual database columns
//     const company = {
//         cnpj: therapistConfig.company_cnpj,
//         companyName: therapistConfig.company_name,
//         tradeName: therapistConfig.company_trade_name,
//         email: therapistConfig.company_email,
//         phone: therapistConfig.company_phone,
//         municipalRegistration: therapistConfig.company_municipal_registration,
//         stateRegistration: therapistConfig.company_state_registration,
//         address: therapistConfig.company_address || {}
//     };

//     // Build settings from individual database columns
//     const settings = {
//         serviceCode: therapistConfig.service_code || "05118",
//         taxRate: therapistConfig.tax_rate || 5,
//         serviceDescription: therapistConfig.service_description || "Serviços de Psicologia",
//         abrasfServiceCode: "416", // Standard code for therapy services
//         issWithholding: false // Default to false, can be made configurable later
//     };

//     const fullCustomerData = {
//         name: customerData.name || session.patient_name || "Paciente",
//         email: customerData.email || session.patient_email || "unknown@example.com",
//         document: customerData.document || "",
//         address: {
//             street: customerData.address?.street || "",
//             number: customerData.address?.number || "",
//             complement: customerData.address?.complement || "",
//             neighborhood: customerData.address?.neighborhood || "",
//             city: customerData.address?.city || "",
//             state: customerData.address?.state || "",
//             zipCode: customerData.address?.zipCode || customerData.address?.zip || "",
//             cityCode: customerData.address?.cityCode || company.address?.cityCode || "",
//         }
//     };

//     const fullServiceData = {
//         description: serviceData.description || settings.serviceDescription,
//         value: serviceData.value || session.preco || 100,
//         quantity: serviceData.quantity || 1,
//         taxRate: serviceData.taxRate || settings.taxRate,
//         serviceCode: serviceData.serviceCode || settings.serviceCode
//     };

//     return {
//         providerCnpj: company.cnpj,
//         providerMunicipalRegistration: company.municipalRegistration,
//         providerCityCode: company.address?.cityCode,

//         customerName: fullCustomerData.name,
//         customerEmail: fullCustomerData.email,
//         customerDocument: fullCustomerData.document,
//         customerAddress: fullCustomerData.address,

//         serviceCode: fullServiceData.serviceCode,
//         abrasfServiceCode: settings.abrasfServiceCode,
//         serviceDescription: fullServiceData.description,
//         serviceValue: fullServiceData.value,
//         taxRate: fullServiceData.taxRate,
//         taxWithheld: settings.issWithholding,

//         sessionDate: session.date
//     };
// }