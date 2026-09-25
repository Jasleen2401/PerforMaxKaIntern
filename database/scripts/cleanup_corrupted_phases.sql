-- ========================================
-- CLEANUP SCRIPT FOR CORRUPTED PHASES
-- ========================================
-- This script identifies and removes phases with dates outside cycle range
-- Run these queries in order

-- Step 1: IDENTIFY corrupted phases (Review first before deleting)
SELECT 
    p.id as 'Phase ID',
    p.phase_number as 'Phase #',
    e.staff_name as 'Employee',
    c.cycle_name as 'Cycle',
    c.start_date as 'Cycle Start',
    c.end_date as 'Cycle End',
    p.phase_start_date as 'Phase Start (INVALID)',
    p.phase_end_date as 'Phase End',
    p.status as 'Status'
FROM kpi_goal_phases p
JOIN employees e ON p.employee_id = e.id
JOIN appraisal_cycles c ON p.cycle_id = c.cycle_id
WHERE p.phase_start_date < c.start_date 
   OR p.phase_start_date > DATE_ADD(c.end_date, INTERVAL 1 DAY)
ORDER BY c.cycle_id, e.staff_name, p.phase_number;

-- Step 2: DELETE corrupted phases (only OPEN phases that are problematic)
-- IMPORTANT: Only run if you're sure these are the corrupted ones
-- DELETE FROM kpi_goal_phases
-- WHERE (phase_start_date < (SELECT start_date FROM appraisal_cycles WHERE cycle_id = kpi_goal_phases.cycle_id)
--    OR phase_start_date > DATE_ADD((SELECT end_date FROM appraisal_cycles WHERE cycle_id = kpi_goal_phases.cycle_id), INTERVAL 1 DAY))
-- AND status = 'OPEN';

-- Step 3: For your specific user (U Ko Ko, based on your earlier message)
-- You can run this to find the exact problematic phase:
SELECT 
    p.id,
    p.phase_number,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.staff_name,
    c.cycle_name,
    p.phase_start_date,
    c.end_date
FROM kpi_goal_phases p
JOIN employees e ON p.employee_id = e.id
JOIN appraisal_cycles c ON p.cycle_id = c.cycle_id
WHERE CONCAT(e.first_name, ' ', e.last_name) = 'U Ko Ko'
ORDER BY p.cycle_id DESC, p.phase_number DESC;

-- Step 4: If you found the problematic phase ID, delete it specifically:
-- For example, if phase ID is 123:
-- DELETE FROM kpi_goal_phases WHERE id = 123;

-- Step 5: Verify cleanup
SELECT * FROM kpi_goal_phases 
WHERE phase_start_date > NOW() 
ORDER BY phase_start_date DESC
LIMIT 10;
