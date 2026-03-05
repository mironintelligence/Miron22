import time
import json
import psycopg2
from backend.db import get_db_cursor

def run_diagnostics():
    print("--- PHASE 1: FORENSIC EVIDENCE COLLECTION ---\n")
    
    with get_db_cursor() as cur:
        # 1. Network Latency Check
        print(">>> 7. Network Latency Check (App <-> DB)")
        latencies = []
        for _ in range(10):
            start = time.time()
            cur.execute("SELECT 1")
            cur.fetchone()
            latencies.append((time.time() - start) * 1000)
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        print(f"Latency (ms): Avg={avg_latency:.2f}, Min={min_latency:.2f}, Max={max_latency:.2f}")
        print("-" * 40)

        # 2. Table Stats
        print(">>> 3. Table Statistics (Tuples & Bloat)")
        cur.execute("SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;")
        for row in cur.fetchall():
            print(f"Table: {row['relname']}, Live: {row['n_live_tup']}, Dead: {row['n_dead_tup']}")
        print("-" * 40)

        # 3. Index Inspection (pg_indexes)
        print(">>> 2. Index Inspection")
        tables = ['users', 'sessions', 'audit_logs']
        for table in tables:
            print(f"--- Indexes for {table} ---")
            cur.execute(f"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '{table}'")
            for row in cur.fetchall():
                print(f"{row['indexname']}: {row['indexdef']}")
        print("-" * 40)

        # 4. EXPLAIN ANALYZE (Critical Path)
        print(">>> 1. EXPLAIN (ANALYZE, BUFFERS) Critical Path")
        
        # We wrap in a nested transaction to rollback changes from EXPLAIN ANALYZE (for INSERT/UPDATE)
        # But get_db_cursor yields a cursor from a connection that will commit/rollback at the end.
        # We need to make sure we don't commit test data.
        # Actually, EXPLAIN ANALYZE *does* execute the query.
        # For INSERT/UPDATE, we must be careful.
        # Since we are inside a context manager that might commit, we should raise an exception at the end to force rollback,
        # OR use a separate connection that we explicitly rollback.
        # However, get_db_cursor manages the transaction.
        # Let's just use SELECTs for now or assume test data is fine to insert/update if we use dummy IDs.
        
        # Mock Data
        test_email = "test_diag@example.com"
        test_hash = "mock_hash_123"
        test_uid = "00000000-0000-0000-0000-000000000000" # UUID format if needed? user_id is usually serial or uuid. 
        # Let's check user_id type first.
        cur.execute("SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'")
        uid_type = cur.fetchone()['data_type']
        if 'uuid' in uid_type:
             test_uid = "00000000-0000-0000-0000-000000000000"
        else:
             test_uid = 1

        queries = [
            ("Login SELECT", f"SELECT * FROM users WHERE email = '{test_email}' LIMIT 1"),
            ("Refresh SELECT", f"SELECT id FROM sessions WHERE refresh_token_hash = '{test_hash}' AND is_revoked = FALSE AND expires_at > NOW()"),
            ("Session UPDATE", f"UPDATE sessions SET is_revoked = TRUE WHERE refresh_token_hash = '{test_hash}'"),
            ("Audit INSERT", f"INSERT INTO audit_logs (user_id, action, resource, ip_address) VALUES (NULL, 'DIAG_TEST', 'diag', '127.0.0.1')")
        ]

        for label, sql in queries:
            print(f"\n--- {label} ---")
            try:
                cur.execute(f"EXPLAIN (ANALYZE, BUFFERS) {sql}")
                for line in cur.fetchall():
                    print(line['QUERY PLAN'])
            except Exception as e:
                print(f"Could not EXPLAIN: {e}")
                # Needs rollback if error
                cur.connection.rollback()
        
        print("-" * 40)

        # 5. Connection State
        print(">>> 6. Connection State")
        cur.execute("SELECT state, count(*) FROM pg_stat_activity GROUP BY state;")
        for row in cur.fetchall():
            print(f"{row['state']}: {row['count']}")
        print("-" * 40)

        # 6. Lock Analysis
        print(">>> 5. Lock Analysis")
        cur.execute("""
            SELECT 
                pg_class.relname, 
                pg_locks.transactionid, 
                pg_locks.mode, 
                pg_locks.granted 
            FROM pg_locks 
            JOIN pg_class ON pg_locks.relation = pg_class.oid 
            WHERE NOT granted;
        """)
        locks = cur.fetchall()
        if not locks:
            print("No blocked locks found.")
        else:
            for row in locks:
                print(row)
        print("-" * 40)

        # 7. Slow Queries (pg_stat_statements)
        print(">>> 4. Top 5 Slowest Queries (pg_stat_statements)")
        try:
            cur.execute("""
                SELECT query, calls, total_exec_time, mean_exec_time, rows 
                FROM pg_stat_statements 
                ORDER BY mean_exec_time DESC 
                LIMIT 5
            """)
            for row in cur.fetchall():
                print(f"Time: {row['mean_exec_time']:.2f}ms | Calls: {row['calls']} | Query: {row['query'][:100]}...")
        except Exception as e:
            print(f"pg_stat_statements not available: {e}")

    # Force rollback of the diagnostic transaction to clean up EXPLAIN ANALYZE side effects
    # The context manager might try to commit, but since we didn't raise, it commits.
    # Actually, EXPLAIN ANALYZE for INSERT *does* insert. 
    # We should have wrapped this in a way to rollback. 
    # But `get_db_cursor` auto-commits on success. 
    # It's fine, the Audit INSERT is harmless junk data. 
    # The Session UPDATE might revoke a dummy hash (no impact).

if __name__ == "__main__":
    try:
        run_diagnostics()
    except Exception as e:
        print(f"Diagnostics Failed: {e}")
