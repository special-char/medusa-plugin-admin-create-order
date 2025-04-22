import { UseFormReturn } from "react-hook-form";
type Props = {
  form: UseFormReturn<any, any, undefined>;
  field: string;
  className?: string;
};
const formattedError = (error?: any, errorName?: string) => {
  let errorMessage;
  if (errorName) {
    if (errorName?.includes(".")) {
      errorMessage =
        error?.[errorName?.split(".")?.[0]]?.[errorName?.split(".")?.[1]];
    } else {
      errorMessage = error?.[errorName];
    }
    return errorMessage;
  }
};
const ErrorMessage = (props: Props) => {
  const errorMessage = formattedError(props.form.formState.errors, props.field);

  return (
    <>
      {errorMessage?.message && (
        <p className={`text-red-500 text-sm ${props.className}`}>
          {errorMessage?.message}
        </p>
      )}
    </>
  );
};

export default ErrorMessage;
