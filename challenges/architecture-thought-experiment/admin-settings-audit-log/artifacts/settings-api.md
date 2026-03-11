# Simplified Settings Write Path

1. admin user submits a settings change from the internal admin panel
2. `tenant-admin-api` authenticates the user and validates the request
3. the API updates the current tenant settings row in the primary database
4. the API returns success to the admin panel

Current gaps:

- only the latest settings state is stored
- there is no durable record of who made a change
- there is no built-in reviewer view for recent changes

