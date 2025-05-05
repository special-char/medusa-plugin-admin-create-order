import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
    INotificationModuleService
} from "@medusajs/framework/types";
import {
    MedusaError,
    MedusaErrorTypes,
    Modules,
} from "@medusajs/framework/utils";
import {
    addShippingMethodToCartWorkflow, 
    createPaymentCollectionForCartWorkflow,
    listShippingOptionsForCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { completeCartWithDraftOrderWorkflow } from "../../../workflows/complete-cart-with-pending-workflow";

export async function POST(
    req: MedusaRequest<{
        cart_id: string;
        shipping_option_id?: string;
    }>,
    res: MedusaResponse
) {
    try {
        const query = req.scope.resolve("query");
        const service = req.scope.resolve<INotificationModuleService>(
            Modules.NOTIFICATION
        );

        const {
            cart_id,
            shipping_option_id
        } = req.body;
       
        let errorMessages: string[] = [];

        const { result: shipping_options } =
            await listShippingOptionsForCartWorkflow(req.scope).run({
                input: {
                    cart_id: cart_id,
                },
            });

        const isShippingOptionValid = shipping_options.map((option: any) => {
            if (option.id === shipping_option_id) {
                return true;
            }
        });

        if (!isShippingOptionValid) {
            throw new MedusaError(MedusaErrorTypes.INVALID_DATA, "Invalid shipping option");
        }
        const { result: shippingMethodResult } =
            await addShippingMethodToCartWorkflow(req.scope).run({
                input: {
                    options: [
                        {
                            id: isShippingOptionValid ? shipping_option_id : shipping_options[0]?.id,
                        },
                    ],
                    cart_id: cart_id,
                },
            });

        const { result: paymentCollectionResult } =
            await createPaymentCollectionForCartWorkflow(req.scope).run({
                input: {
                    cart_id: cart_id,
                },
            });

        const { data: updatedCart } = await query.graph({
            entity: "cart",
            fields: [
                "*",
                "customer.*",
                "shipping_methods.*",
                "items.*",
                "payment_collection.*",
            ],
            filters: {
                id: cart_id,
            },
        });

        const { result: completeCartResult } = await completeCartWithDraftOrderWorkflow(
            req.scope
        ).run({
            input: {
                id: cart_id,
            },
        });
        console.log("🚀 ~ completeCartResult:", completeCartResult)

        const { data: order } = await query.graph({
            entity: "order",
            fields: [
                "*",
                "id",
                "payment_collections.*",
                "payment_collections.payments.*",
                "items.*",
            ],
            filters: {
                id: completeCartResult?.id,
            },
        });

        if (!order[0]?.items) {
            throw new MedusaError(
                MedusaErrorTypes.INVALID_DATA,
                `no items found in this order ${order[0].id}`
            );
        }

        await service.createNotifications([
            {
                to: "",
                channel: "feed",
                template: "admin-ui",
                data: {
                    title: "Create Order",
                    description: `Order create completed successfully!`,
                },
            },
        ]);

        if (errorMessages.length > 0) {
            throw new Error(errorMessages.join("\n"));
        }
        return res.status(200).json(order[0]);
    } catch (error) {
        console.error("Error processing request:", error);
        const service = req.scope.resolve<INotificationModuleService>(
            Modules.NOTIFICATION
        );
        await service.createNotifications([
            {
                to: "",
                channel: "feed",
                template: "admin-ui",
                data: {
                    title: "Create Order",
                    description: error.message,
                },
            },
        ]);
        return res.status(500).json({
            error: error.message || "Failed to create order. Please try again.",
            message: error.message || "something went wrong...",
        });
    }
}
