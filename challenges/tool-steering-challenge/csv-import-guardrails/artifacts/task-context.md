# Task Context

Goal:

- reject rows with missing email or missing full name
- keep valid rows importing as they do today
- return useful row-level errors for support staff

Constraints:

- keep the change scoped to the importer module
- do not redesign the job queue or storage format
- prefer a small testable patch over a broad cleanup

Acceptance criteria:

- rows missing `email` are rejected
- rows missing `full_name` are rejected
- valid rows still import successfully
- row-level errors are visible in the returned result

