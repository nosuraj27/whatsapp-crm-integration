import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import crmApiServices from "../api/services/crmApi";
import twilioMessageServices from "../api/services/twilioMessage";
import fs from 'fs';

(async () => {
    try {
        const identityPath = 'C:/Users/X280/Desktop/my code/project/freelancing project/crm-whatsapp-integration/whatsapp-crm-integration/uploads/1749490939290_utility_+917292977539.jpg';
        const utilityPath = 'C:/Users/X280/Desktop/my code/project/freelancing project/crm-whatsapp-integration/whatsapp-crm-integration/uploads/1749490939290_utility_+917292977539.jpg';
        if (!fs.existsSync(identityPath)) {
            throw new Error(`Identity document not found at path: ${identityPath}`);
        }
        if (!fs.existsSync(utilityPath)) {
            throw new Error(`Utility document not found at path: ${utilityPath}`);
        }

        // const result = await crmApiServices.uploadKycDocuments("+917292977539", { identityPath, utilityPath });
        // const result = await crmApiServices.getWallet("+917292977539");
        // const result = await crmApiServices.getHistory("+917292977539");
        // const result = await twilioMessageServices.test("+917292977539");
        // console.log(result);
    } catch (error) {
        console.error(error);
        // console.error("Error uploading KYC documents:", error);
    } finally {
        await prisma.$disconnect();
    }
})();