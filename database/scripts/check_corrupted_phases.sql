-- Find all phases with invalid start dates (outside cycle range)
SELECT 
    p.id,
    p.phase_number,
    p.employee_id,
    p.cycle_id,
    e.staff_name,
    c.cycle_name,
    c.start_date as cycle_start,
    c.end_date as cycle_end,
    p.phase_start_date,
    p.phase_end_date,
    p.status
FROM kpi_goal_phases p
JOIN employees e ON p.employee_id = e.id
JOIN appraisal_cycles c ON p.cycle_id = c.cycle_id
WHERE p.phase_start_date < c.start_date 
   OR p.phase_start_date > DATE_ADD(c.end_date, INTERVAL 1 DAY)
ORDER BY p.cycle_id, p.employee_id, p.phase_number;

-- Alternative: Check specifically for phases with dates in the future compared to today
SELECT 
    p.id,
    p.phase_number,
    p.employee_id,
    p.cycle_id,
    e.staff_name,
    c.cycle_name,
    p.phase_start_date,
    DATEDIFF(p.phase_start_date, NOW()) as days_in_future
FROM kpi_goal_phases p
JOIN employees e ON p.employee_id = e.id
JOIN appraisal_cycles c ON p.cycle_id = c.cycle_id
WHERE p.phase_start_date > NOW()
  AND c.end_date < DATE_ADD(p.phase_start_date, INTERVAL 1 DAY)
ORDER BY p.cycle_id, p.employee_id, p.phase_number;
