# Backup And Restore

Dr Mirror targets RPO <= 1 hour and RTO <= 2 hours for SQL Server data.

## Backup Policy

- Take database backups at least hourly in production.
- Retain short-term backups for operational recovery and longer-term backups per host capability.
- Store backups outside the application content directory.

## Restore Drill

1. Select the latest staging backup.
2. Restore it into a parallel drill database.
3. Point a sandbox API instance at the drill database.
4. Run EF migrations if required.
5. Call `/api/health/ready` and confirm Healthy.
6. Validate recent orders and catalog data are present.
7. Record elapsed time from restore start to Healthy API.

## Acceptance

- Restore completes within 2 hours.
- Data loss window is no more than 1 hour.
- Drill is repeated quarterly and after major migration changes.
