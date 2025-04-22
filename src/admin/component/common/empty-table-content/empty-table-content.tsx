import { ExclamationCircle, MagnifyingGlass, PlusMini } from "@medusajs/icons"
import { Button, Text, clx } from "@medusajs/ui"
import { Link } from "react-router-dom"

export type NoResultsProps = {
  title?: string
  message?: string
  className?: string
}

export const NoResults = ({ title, message, className }: NoResultsProps) => {


  return (
    <div
      className={clx(
        "flex h-[400px] w-full items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-2">
        <MagnifyingGlass />
        <Text size="small" leading="compact" weight="plus">
          {title ?? "No results found"}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {message ?? "No results found"}
        </Text>
      </div>
    </div>
  )
}

type ActionProps = {
  action?: {
    to: string
    label: string
  }
}

type NoRecordsProps = {
  title?: string
  message?: string
  className?: string
  buttonVariant?: string
} & ActionProps

const DefaultButton = ({ action }: ActionProps) =>
  action && (
    <Link to={action.to}>
      <Button variant="secondary" size="small">
        {action.label}
      </Button>
    </Link>
  )

const TransparentIconLeftButton = ({ action }: ActionProps) =>
  action && (
    <Link to={action.to}>
      <Button variant="transparent" className="text-ui-fg-interactive">
        <PlusMini /> {action.label}
      </Button>
    </Link>
  )

export const NoRecords = ({
  title,
  message,
  action,
  className,
  buttonVariant = "default",
}: NoRecordsProps) => {

  return (
    <div
      className={clx(
        "flex h-[400px] w-full flex-col items-center justify-center gap-y-4",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-3">
        <ExclamationCircle className="text-ui-fg-subtle" />

        <div className="flex flex-col items-center gap-y-1">
          <Text size="small" leading="compact" weight="plus">
            {title ?? "No records found"}
          </Text>

          <Text size="small" className="text-ui-fg-muted">
            {message ?? "No records found"}
          </Text>
        </div>
      </div>

      {buttonVariant === "default" && <DefaultButton action={action} />}
      {buttonVariant === "transparentIconLeft" && (
        <TransparentIconLeftButton action={action} />
      )}
    </div>
  )
}
