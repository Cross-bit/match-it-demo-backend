# Common seeding SQL scripts
Allows common seeding directly using sql syntax.
It is not so flexible as using code defined entities.
Useful for large static test data sets.

Files located in this directory are supposed to be used
by the **PostgresSeeder** from`pg-database-script-seeder.ts`
utility script.

Simply pass the sql file path when calling the **PostgresSeeder**'s `setupDatabase(__path_to_test_seed_data__)`.

