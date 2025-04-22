import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button } from "@medusajs/ui"
import { Link } from "react-router-dom"
// The widget
const CreateOrderWidget = () => {
    return (
        <Button
            size="small"
            variant="secondary"
            asChild
            className="ml-auto"
            style={{ float: 'right' }}
        >
            <Link to="/orders/create">
                Create Order
            </Link>
        </Button>
    )
}

// The widget's configurations
export const config = defineWidgetConfig({
    zone: "order.list.before",
})

export default CreateOrderWidget