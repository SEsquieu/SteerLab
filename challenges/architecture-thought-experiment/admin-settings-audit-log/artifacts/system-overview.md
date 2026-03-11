# System Overview

- the admin panel is a small internal React app used by support and operations staff
- settings changes go through a single backend service called `tenant-admin-api`
- the service writes directly to the main relational database
- there is no existing history table for settings changes
- the current team is 4 engineers and prefers simple operational patterns
- compliance requirements are light, but access to sensitive tenant data still matters

