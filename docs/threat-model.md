# Defensive Threat Model

## Assets

- Account access and recovery controls
- Identity-related profile context
- Contact-information privacy
- Location and routine privacy
- Private content and social relationships

## Threats and controls

| Threat | Exposure path | Potential impact | Recommended control |
| --- | --- | --- | --- |
| Account takeover | MFA disabled, reused passwords, unknown sessions | Loss of account control, impersonation | Enable MFA, use unique passwords, review sessions and login alerts |
| Impersonation | Public employer, school, family, or travel context | More convincing fraudulent messages | Limit public context and verify requests independently |
| Phishing | Unexpected links, giveaways, or verification-code requests | Credential or account compromise | Pause, inspect the destination, and never share codes |
| Unwanted profiling | Public posts, comments, follower lists, and old accounts | Context aggregation and targeted contact | Review historical content and narrow audience settings |
| Location exposure | Real-time posts, geotags, check-ins, and travel plans | Routine or absence inference | Delay sharing and remove unnecessary location signals |
| Third-party access | Old integrations or broad permissions | Unnecessary data access | Review and revoke unused apps using least privilege |

This framework evaluates only voluntarily entered settings and habits. It does
not identify real people, enumerate accounts, scrape services, or generate
attack instructions.