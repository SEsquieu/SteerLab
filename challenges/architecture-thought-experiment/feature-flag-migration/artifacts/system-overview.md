# System Overview

- Frontend: React web app and native mobile clients
- Backend: Node.js API gateway, Python billing service, Go notification service
- Deployments: Kubernetes in two regions
- Current release model: continuous deployment for backend, weekly app releases for mobile
- Current flag pattern: booleans and ad hoc allowlists checked in service code

Constraints:

- Billing and onboarding flows must support emergency disable paths
- Mobile clients cannot rely on instant app-store updates
- Product teams want percentage rollouts and cohort targeting
- Security wants admin actions to be auditable
- Platform team has limited bandwidth for a large new control-plane service

