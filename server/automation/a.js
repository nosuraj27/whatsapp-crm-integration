import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import crmApiServices from "../api/services/crmApi";
import twilioMessageServices from "../api/services/twilioMessage";
import fs from 'fs';

(async () => {
    try {

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