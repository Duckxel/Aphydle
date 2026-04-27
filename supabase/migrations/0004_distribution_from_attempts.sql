-- Repoint the finish-screen histogram at aphydle.attempts.
--
-- daily_distribution used to aggregate aphydle.puzzle_results, but
-- puzzle_results requires a stable player_id and only fills in once
-- the host finalises a result — analytics-style anon plays often
-- never make it in. attempts is now upserted to one row per
-- (anon_id, puzzle_no), so it already encodes "did this player
-- finish, and on which attempt", which is exactly what the
-- histogram needs.
--
-- Buckets:
--   bucket_1..bucket_10  → wins, indexed by attempt_no
--   bucket_lost          → players who used all 10 attempts without
--                          guessing correctly
--   total_played         → wins + losses (mid-game rows are excluded
--                          so the bars don't move under the player's
--                          marker before they finish)

create or replace view aphydle.daily_distribution as
select
    puzzle_no,
    sum(case when is_correct and attempt_no = 1  then 1 else 0 end)::int as bucket_1,
    sum(case when is_correct and attempt_no = 2  then 1 else 0 end)::int as bucket_2,
    sum(case when is_correct and attempt_no = 3  then 1 else 0 end)::int as bucket_3,
    sum(case when is_correct and attempt_no = 4  then 1 else 0 end)::int as bucket_4,
    sum(case when is_correct and attempt_no = 5  then 1 else 0 end)::int as bucket_5,
    sum(case when is_correct and attempt_no = 6  then 1 else 0 end)::int as bucket_6,
    sum(case when is_correct and attempt_no = 7  then 1 else 0 end)::int as bucket_7,
    sum(case when is_correct and attempt_no = 8  then 1 else 0 end)::int as bucket_8,
    sum(case when is_correct and attempt_no = 9  then 1 else 0 end)::int as bucket_9,
    sum(case when is_correct and attempt_no = 10 then 1 else 0 end)::int as bucket_10,
    sum(case when not is_correct and attempt_no = 10 then 1 else 0 end)::int as bucket_lost,
    sum(case when is_correct or attempt_no = 10 then 1 else 0 end)::int as total_played
from aphydle.attempts
group by puzzle_no;

grant select on aphydle.daily_distribution to anon, authenticated;
