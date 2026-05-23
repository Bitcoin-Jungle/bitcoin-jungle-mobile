// Display name for a contact under the UserContact model. username is nullable
// (external lightning-address contacts have none), so fall back through the
// available identity fields. Order: alias, username, lightningAddress, id.
export const contactDisplayName = (contact: Contact): string =>
  contact.alias || contact.username || contact.lightningAddress || contact.id

// The single identity field a mutation must carry (exactly one of username /
// lightningAddress). BJ contacts key off username; external contacts off
// lightningAddress.
export const contactIdentityInput = (
  contact: Contact,
): { username: string } | { lightningAddress: string } =>
  contact.username
    ? { username: contact.username }
    : { lightningAddress: contact.lightningAddress as string }
