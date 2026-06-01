import { gql } from "@apollo/client"

// Shared contact selection — must match the UserContact shape returned by me.contacts.
// All contact-touching screens (list, detail, add, send) use these documents so the
// Apollo cache normalizes contacts on a single, consistent shape (keyed by `id`).

const USER_CONTACT_FIELDS = gql`
  fragment UserContactFields on UserContact {
    id
    username
    lightningAddress
    alias
    transactionsCount
  }
`

export const CONTACTS = gql`
  query contacts {
    me {
      id
      contacts {
        ...UserContactFields
      }
    }
  }
  ${USER_CONTACT_FIELDS}
`

export const USER_CONTACT_ADD = gql`
  mutation userContactAdd($input: UserContactAddInput!) {
    userContactAdd(input: $input) {
      errors {
        message
      }
      contact {
        ...UserContactFields
      }
    }
  }
  ${USER_CONTACT_FIELDS}
`

export const USER_CONTACT_UPDATE_ALIAS = gql`
  mutation userContactUpdateAlias($input: UserContactUpdateAliasInput!) {
    userContactUpdateAlias(input: $input) {
      errors {
        message
      }
      contact {
        ...UserContactFields
      }
    }
  }
  ${USER_CONTACT_FIELDS}
`

export const USER_CONTACT_DELETE = gql`
  mutation userContactDelete($input: UserContactDeleteInput!) {
    userContactDelete(input: $input) {
      errors {
        message
      }
      contact {
        ...UserContactFields
      }
    }
  }
  ${USER_CONTACT_FIELDS}
`
