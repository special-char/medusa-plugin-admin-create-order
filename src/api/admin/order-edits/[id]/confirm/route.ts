import { confirmOrderEditRequestWorkflow, convertDraftOrderWorkflow, useRemoteQueryStep } from "@medusajs/core-flows"
import { HttpTypes, OrderChangeDTO } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { OrderChangeStatus } from "@medusajs/framework/utils"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params


  const { result } = await confirmOrderEditRequestWorkflow(req.scope).run({
    input: {
      order_id: id,
      confirmed_by: req.auth_context.actor_id,
    },
  })


  res.json({
    order_preview: result as unknown as HttpTypes.AdminOrderPreview,
  })
}
