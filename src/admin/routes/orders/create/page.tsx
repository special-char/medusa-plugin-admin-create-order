
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { OrderCreateForm } from "../../../component/order-create-form/order-create-form"

const OrderCreate = () => {
    return (
        <OrderCreateForm />
    )
}
export const config = defineRouteConfig({
    label: "Create Order",
    nested: "/orders",
})

export default OrderCreate
