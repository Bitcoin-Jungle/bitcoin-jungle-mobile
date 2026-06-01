import { InMemoryCache } from "@apollo/client"
import "moment/locale/es"

export const cache = new InMemoryCache({
  typePolicies: {
    Earn: {
      fields: {
        completed: {
          read: (value) => value ?? false,
        },
      },
    },
  },
})
