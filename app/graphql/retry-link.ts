import { RetryLink } from "@apollo/client/link/retry"
import { getMainDefinition } from "@apollo/client/utilities"

export const createRetryLink = () =>
  new RetryLink({
    delay: { initial: 500 },
    attempts: {
      max: 3,
      retryIf: (error, operation) => {
        const definition = getMainDefinition(operation.query)
        // A lost response does not mean a mutation failed. Only retry reads;
        // payment safety must not depend on maintaining operation-name lists.
        return (
          !!error &&
          definition.kind === "OperationDefinition" &&
          definition.operation === "query"
        )
      },
    },
  })
