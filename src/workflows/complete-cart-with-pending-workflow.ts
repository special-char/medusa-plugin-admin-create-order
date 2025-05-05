import {
    CartCreditLineDTO,
    CartWorkflowDTO,
    UsageComputedActions,
} from "@medusajs/framework/types"
import {
    isDefined,
    Modules,
    OrderStatus,
    OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import {
    createWorkflow,
    parallelize,
    transform,
    when,
    WorkflowData,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { beginOrderEditOrderWorkflow, createOrderWorkflow, createRemoteLinkStep, emitEventStep, updateCartsStep, useQueryGraphStep, useRemoteQueryStep, validateShippingStep } from "@medusajs/medusa/core-flows"
import { prepareAdjustmentsData, prepareLineItemData, PrepareLineItemDataInput, prepareTaxLinesData } from "./utils/prepare-line-item-data"

import { registerUsageStep } from "./utils/register-usage"
/**
 * The data to complete a cart and place an order.
 */
export type CompleteCartWorkflowInput = {
    /**
     * The ID of the cart to complete.
     */
    id: string
}

export type CompleteCartWorkflowOutput = {
    /**
     * The ID of the order that was created.
     */
    id: string
}

export const THREE_DAYS = 60 * 60 * 24 * 3

export const completeCartWorkflowId = "complete-cart-with-pending"
/**
 * This workflow completes a cart and places an order for the customer. It's executed by the
 * [Complete Cart Store API Route](https://docs.medusajs.com/api/store#carts_postcartsidcomplete).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to wrap custom logic around completing a cart.
 * For example, in the [Subscriptions recipe](https://docs.medusajs.com/resources/recipes/subscriptions/examples/standard#create-workflow),
 * this workflow is used within another workflow that creates a subscription order.
 *
 * @example
 * const { result } = await completeCartWorkflow(container)
 * .run({
 *   input: {
 *     id: "cart_123"
 *   }
 * })
 *
 * @summary
 *
 * Complete a cart and place an order.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 */
export const completeCartFields = [
    "metadata",
    "id",
    "currency_code",
    "email",
    "created_at",
    "updated_at",
    "completed_at",
    "total",
    "subtotal",
    "tax_total",
    "discount_total",
    "discount_tax_total",
    "original_total",
    "original_tax_total",
    "item_total",
    "item_subtotal",
    "item_tax_total",
    "sales_channel_id",
    "original_item_total",
    "original_item_subtotal",
    "original_item_tax_total",
    "shipping_total",
    "shipping_subtotal",
    "shipping_tax_total",
    "original_shipping_tax_total",
    "original_shipping_subtotal",
    "original_shipping_total",
    "raw_total",
    "raw_subtotal",
    "raw_tax_total",
    "raw_discount_total",
    "raw_discount_tax_total",
    "raw_original_total",
    "raw_original_tax_total",
    "raw_item_total",
    "raw_item_subtotal",
    "raw_item_tax_total",
    "raw_sales_channel_id",
    "raw_original_item_total",
    "raw_original_item_subtotal",
    "raw_original_item_tax_total",
    "raw_shipping_total",
    "raw_shipping_subtotal",
    "raw_shipping_tax_total",
    "raw_original_shipping_tax_total",
    "raw_original_shipping_subtotal",
    "raw_original_shipping_total",
    "items.*",
    "items.tax_lines.*",
    "items.adjustments.*",
    "customer.*",
    "shipping_methods.*",
    "shipping_methods.tax_lines.*",
    "shipping_methods.adjustments.*",
    "shipping_address.*",
    "billing_address.*",
    "region.*",
    "payment_collection.*",
    "payment_collection.payment_sessions.*",
    "items.variant.id",
    "items.variant.product.id",
    "items.variant.product.shipping_profile.id",
    "items.variant.manage_inventory",
    "items.variant.allow_backorder",
    "items.variant.inventory_items.inventory_item_id",
    "items.variant.inventory_items.required_quantity",
    "items.variant.inventory_items.inventory.requires_shipping",
    "items.variant.inventory_items.inventory.location_levels.stock_locations.id",
    "items.variant.inventory_items.inventory.location_levels.stock_locations.name",
    "items.variant.inventory_items.inventory.location_levels.stock_locations.sales_channels.id",
    "items.variant.inventory_items.inventory.location_levels.stock_locations.sales_channels.name",
]
export const completeCartWithDraftOrderWorkflow = createWorkflow(
    {
        name: completeCartWorkflowId,
        store: true,
        idempotent: true,
        retentionTime: THREE_DAYS,
    },
    (input: WorkflowData<CompleteCartWorkflowInput>) => {
        const orderCart = useQueryGraphStep({
            entity: "order_cart",
            fields: ["cart_id", "order_id"],
            filters: { cart_id: input.id },
        })

        const orderId = transform({ orderCart }, ({ orderCart }) => {
            return orderCart.data[0]?.order_id
        })

        const cart = useRemoteQueryStep({
            entry_point: "cart",
            fields: completeCartFields,
            variables: { id: input.id },
            list: false,
        }).config({
            name: "cart-query",
        })

        // If order ID does not exist, we are completing the cart for the first time
        const order = when("create-order", { orderId }, ({ orderId }) => {
            return !orderId
        }).then(() => {
            const cartOptionIds = transform({ cart }, ({ cart }) => {
                return cart.shipping_methods?.map((sm) => sm.shipping_option_id)
            })

            const shippingOptions = useRemoteQueryStep({
                entry_point: "shipping_option",
                fields: ["id", "shipping_profile_id"],
                variables: { id: cartOptionIds },
                list: true,
            }).config({
                name: "shipping-options-query",
            })

            validateShippingStep({ cart, shippingOptions })

            const cartToOrder = transform({ cart }, ({ cart }) => {


                const allItems = (cart.items ?? []).map((item) => {
                    const input: PrepareLineItemDataInput = {
                        item,
                        variant: item.variant,
                        cartId: cart.id,
                        unitPrice: item.unit_price,
                        isTaxInclusive: item.is_tax_inclusive,
                        taxLines: item.tax_lines ?? [],
                        adjustments: item.adjustments ?? [],
                    }

                    return prepareLineItemData(input)
                })

                const shippingMethods = (cart.shipping_methods ?? []).map((sm) => {
                    return {
                        name: sm.name,
                        description: sm.description,
                        amount: sm.raw_amount ?? sm.amount,
                        is_tax_inclusive: sm.is_tax_inclusive,
                        shipping_option_id: sm.shipping_option_id,
                        data: sm.data,
                        metadata: sm.metadata,
                        tax_lines: prepareTaxLinesData(sm.tax_lines ?? []),
                        adjustments: prepareAdjustmentsData(sm.adjustments ?? []),
                    }
                })

                const creditLines = (cart.credit_lines ?? []).map(
                    (creditLine: CartCreditLineDTO) => {
                        return {
                            amount: creditLine.amount,
                            raw_amount: creditLine.raw_amount,
                            reference: creditLine.reference,
                            reference_id: creditLine.reference_id,
                            metadata: creditLine.metadata,
                        }
                    }
                )

                const itemAdjustments = allItems
                    .map((item) => item.adjustments ?? [])
                    .flat(1)
                const shippingAdjustments = shippingMethods
                    .map((sm) => sm.adjustments ?? [])
                    .flat(1)

                const promoCodes = [...itemAdjustments, ...shippingAdjustments]
                    .map((adjustment) => adjustment.code)
                    .filter(Boolean)

                return {
                    region_id: cart.region?.id,
                    customer_id: cart.customer?.id,
                    sales_channel_id: cart.sales_channel_id,
                    // status: OrderStatus.DRAFT,
                    email: cart.email,
                    currency_code: cart.currency_code,
                    shipping_address: cart.shipping_address,
                    billing_address: cart.billing_address,
                    items: allItems,
                    shipping_methods: shippingMethods,
                    metadata: cart.metadata,
                    promo_codes: promoCodes,
                    // is_draft_order: true,
                    credit_lines: creditLines,
                    no_notification: false
                }
            })

            // const createdOrders = createOrdersStep([cartToOrder])
            const createdOrder = createOrderWorkflow.runAsStep({
                input: cartToOrder,
            });

            // Add order edit workflow
            const orderEditInput = transform({ createdOrder }, ({ createdOrder }) => {
                return {
                    order_id: createdOrder.id,
                    internal_note: "Initial order edit",
                }
            })

            const orderEdit = beginOrderEditOrderWorkflow.runAsStep({
                input: orderEditInput,
            })

            const updateCompletedAt = transform({ cart }, ({ cart }) => {
                return {
                    id: cart.id,
                    completed_at: new Date(),
                }
            })

            const linksToCreate = transform(
                { cart, createdOrder },
                ({ cart, createdOrder }) => {
                    const links: Record<string, any>[] = [
                        {
                            [Modules.ORDER]: { order_id: createdOrder.id },
                            [Modules.CART]: { cart_id: cart.id },
                        },
                    ]

                    if (isDefined(cart.payment_collection?.id)) {
                        links.push({
                            [Modules.ORDER]: { order_id: createdOrder.id },
                            [Modules.PAYMENT]: {
                                payment_collection_id: cart.payment_collection.id,
                            },
                        })
                    }

                    return links
                }
            )

            parallelize(
                createRemoteLinkStep(linksToCreate),
                updateCartsStep([updateCompletedAt]),
                emitEventStep({
                    eventName: OrderWorkflowEvents.PLACED,
                    data: { id: createdOrder.id },
                })
            )

            const promotionUsage = transform(
                { cart },
                ({ cart }: { cart: CartWorkflowDTO }) => {
                    const promotionUsage: UsageComputedActions[] = []

                    const itemAdjustments = (cart.items ?? [])
                        .map((item) => item.adjustments ?? [])
                        .flat(1)

                    const shippingAdjustments = (cart.shipping_methods ?? [])
                        .map((item) => item.adjustments ?? [])
                        .flat(1)

                    for (const adjustment of itemAdjustments) {
                        promotionUsage.push({
                            amount: adjustment.amount,
                            code: adjustment.code!,
                        })
                    }

                    for (const adjustment of shippingAdjustments) {
                        promotionUsage.push({
                            amount: adjustment.amount,
                            code: adjustment.code!,
                        })
                    }

                    return promotionUsage
                }
            )

            registerUsageStep(promotionUsage)

            return createdOrder
        })

        const result = transform({ order, orderId }, ({ order, orderId }) => {
            return { id: order?.id ?? orderId } as CompleteCartWorkflowOutput
        })

        return new WorkflowResponse(result,)
    }
)
