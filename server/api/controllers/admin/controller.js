import Joi from "joi";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import qrcode from "qrcode";

// common function
import apiError from '../../../helper/apiError';
import response from '../../../../assets/response';
import responseMessage from "../../../../assets/responseMessage";
import commonFunction from '../../../helper/utils';
import messageTemplate from "../../../helper/messageTemplate";
import { apiLogHandler } from "../../../helper/apiLogHandler";

// enum 
import status from "../../../enums/status";

// services import
import userServices from "../../services/user";
import apiCall from "../../../helper/apiCall";
import adminSessionServices from "../../services/adminSession";

export class userController {


    /**
     * @swagger
     * /admin/login:
     *   post:
     *     summary: Login with identity and password
     *     description: Login with email or phone and password
     *     tags: ["AUTH"]
     *     produces: ["application/json"]
     *     parameters:
     *       - name: requestBody
     *         description: Login credentials
     *         in: body
     *         required: true
     *         schema:
     *           type: object
     *           properties:
     *             email: { type: "string", example: "admin@admin.com" }
     *             password: { type: "string", example: "12345678" }
     *     responses:
     *       200: { description: 'Login successful.', schema: { $ref: '#/definitions/successResponse' } }
     *       404: { description: 'User not found.', schema: { $ref: '#/definitions/errorResponse' } }
     */
    async login(req, res, next) {
        const validationSchema = Joi.object({
            email: Joi.string().required(),
            password: Joi.string().required(),
        });

        try {
            const validatedBody = await validationSchema.validateAsync(req.body);

            const result = await apiCall("post", "/api/auth/signin", validatedBody);

            if (!result || !result.token) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }

            let adminSession = await adminSessionServices.find();
            if (!adminSession) {
                const sessionData = {
                    token: result.token
                };
                adminSession = await adminSessionServices.create(sessionData);
            } else {
                await adminSessionServices.update({ id: adminSession.id }, { token: result.token });
            }

            await apiLogHandler(req, result);
            return res.json(new response(result, "Login Successful"));
        } catch (error) {
            next(error);
        }
    }

}
export default new userController();




