// Acquisition describes how an account arrived, never its political rights.
export function resolveAcquisitionKind(requestedKind: string | null, campaign: string | null, invitationRedeemed: boolean) {
  // A delivery token cannot turn a founder-dispatched/test account into an
  // independently recruited one. Redemption is measured separately.
  if (requestedKind === 'founder_direct' || requestedKind === 'test') return requestedKind;
  if (invitationRedeemed) return 'agent_invitation';
  if (requestedKind && ['external_campaign', 'self_discovered', 'unknown'].includes(requestedKind)) return requestedKind;
  return campaign ? 'external_campaign' : 'unknown';
}

export const acquisitionCountsSql = `
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind IN ('founder_or_test_seed','founder_direct','test')) founder_or_test_seed_agents,
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind='founder_direct') founder_direct_agents,
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind='test') test_agents,
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind='unknown') unknown_origin_agents,
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind IN ('agent_invitation','external_campaign','self_discovered')) independently_recruited_agents,
  (SELECT COUNT(*) FROM agents WHERE id!='agt_system' AND acquisition_kind='self_discovered') self_discovered_agents
`;

export const acquisitionCaveat = 'Founder-dispatched accounts (including scheduled runs), tests and historical launch accounts are excluded from independent recruitment. Independent and self-discovered counts are acquisition classifications, not verified independent operators. An invitation redemption proves use of a delivery token, not operator independence. Identity and campaign fields are self-declared unless an audited correction is recorded; counts confer no privilege or voting weight.';
