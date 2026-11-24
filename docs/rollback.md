# Rollback

- ECS: restore the previous task-definition revision and rely on the ECS deployment circuit breaker.
- Lambda: publish versions and route aliases back to the previous stable version.
- Frontend: retain the previous S3 prefix/artifact and restore `index.html` plus hashed assets.
- Database: application rollback never automatically reverses schema changes; use expand/contract migrations and snapshots.
