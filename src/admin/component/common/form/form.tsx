import { InformationCircleSolid } from "@medusajs/icons"
import {
  Hint,
  Label as UILabel,
  Text,
  Tooltip,
  clx,
} from "@medusajs/ui"
import React, { createContext, forwardRef, useContext, useId } from "react"
import {
  Controller,
  ControllerProps,
  FieldError,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form"

const FormFieldContext = createContext<{ name: string }>({} as { name: string })
const FormItemContext = createContext<{ id: string }>({} as { id: string })

type FormFieldContextState = {
  id: string
  name: string
  formItemId: string
  formLabelId: string
  formDescriptionId: string
  formErrorMessageId: string
  error?: FieldError
}

const useFormField = (): FormFieldContextState => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const formContext = useFormContext()

  if (!formContext || !fieldContext) {
    return {
      id: itemContext?.id || "",
      name: "",
      formItemId: "",
      formLabelId: "",
      formDescriptionId: "",
      formErrorMessageId: "",
      error: undefined,
    }
  }

  const { getFieldState } = formContext
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formLabelId: `${id}-form-item-label`,
    formDescriptionId: `${id}-form-item-description`,
    formErrorMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const Field = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const Item = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = useId()
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={clx("flex flex-col space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    )
  }
)
Item.displayName = "Form.Item"

const Label = forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof UILabel> & {
    optional?: boolean
    tooltip?: React.ReactNode
    icon?: React.ReactNode
  }
>(({ className, optional = false, tooltip, icon, ...props }, ref) => {
  const { formLabelId, formItemId } = useFormField()

  return (
    <div className="flex items-center gap-x-1">
      <UILabel
        ref={ref}
        id={formLabelId}
        htmlFor={formItemId}
        className={className}
        size="small"
        weight="plus"
        {...props}
      />
      {tooltip && (
        <Tooltip content={tooltip}>
          <InformationCircleSolid className="text-ui-fg-muted" />
        </Tooltip>
      )}
      {icon}
      {optional && (
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          (Optional)
        </Text>
      )}
    </div>
  )
})
Label.displayName = "Form.Label"

const Control = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formErrorMessageId, formLabelId } =
      useFormField()

    return (
      <div
        ref={ref}
        id={formItemId}
        aria-describedby={
          !error
            ? formDescriptionId
            : `${formDescriptionId} ${formErrorMessageId}`
        }
        aria-invalid={!!error}
        aria-labelledby={formLabelId}
        {...props}
      />
    )
  }
)
Control.displayName = "Form.Control"

const ErrorMessage = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formErrorMessageId } = useFormField()
  const msg = error ? String(error?.message) : children

  if (!msg || msg === "undefined") {
    return null
  }

  return (
    <Hint
      ref={ref}
      id={formErrorMessageId}
      className={className}
      variant="error"
      {...props}
    >
      {msg}
    </Hint>
  )
})
ErrorMessage.displayName = "Form.ErrorMessage"

const FormHint = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  return (
    <Hint
      ref={ref}
      id={formDescriptionId}
      className={className}
      {...props}
    />
  )
})
FormHint.displayName = "Form.Hint"

export const Form = Object.assign(FormProvider, {
  Item,
  Label,
  Control,
  Hint: FormHint,
  ErrorMessage,
  Field,
})
