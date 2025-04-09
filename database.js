const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = "https://adsnebivksfdycwmejeh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkc25lYml2a3NmZHljd21lamVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjQwNjEsImV4cCI6MjA1ODkwMDA2MX0.h7iJPsHKx8DB4M8fig9EVwiUG8X4eQpHuzhLbxv5mgU";
const supabase = createClient(supabaseUrl, supabaseKey);
// Table definitions
const table_dict = {
  users: `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );`,

  tasks: `
    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      user_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority INT CHECK (priority BETWEEN 1 AND 5),
      estimated_time INTERVAL,
      task_day VARCHAR(10) CHECK (task_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
      created_at TIMESTAMP DEFAULT NOW()
    );`,

  schedule: `
    CREATE TABLE schedule (
      id SERIAL PRIMARY KEY,
      user_id INT,
      task_id INT,
      day VARCHAR(10) CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      priority INT NOT NULL,
      status VARCHAR(20) CHECK (status IN ('pending', 'in-progress', 'completed'))
    );`
};

// Helper functions
async function tableExists(tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    return !error;
  } catch (err) {
    return false;
  }
}

async function createTable(tablename) {
  const query = table_dict[tablename];
  if (!query) return false;
  const { error } = await supabase.rpc('execute_sql', { query });
  return !error;
}

// User operations
async function create_user(params) {
  const { error } = await supabase.from('users').insert({
    name: params.name,
    email: params.email,
    phone_number: params.phone_number
  });
  return !error;
}

async function get_user(user_id) {
  const { data } = await supabase.from('users').select('*').eq('id', user_id).single();
  return data || null;
}

// Task operations
async function insert_task(params) {
  const { error } = await supabase.from('tasks').insert({
    user_id: params.user_id,
    title: params.title,
    description: params.description,
    priority: params.priority,
    estimated_time: params.estimated_time,
    task_day: params.task_day
  });
  return !error;
}

async function get_user_tasks(user_id) {
  const { data } = await supabase.from('tasks').select('*').eq('user_id', user_id);
  return data;
}

// Schedule operations
async function insert_schedule(params) {
  const { error } = await supabase.from('schedule').insert({
    user_id: params.user_id,
    task_id: params.task_id,
    day: params.day,
    start_time: params.start_time,
    end_time: params.end_time,
    priority: params.priority,
    status: params.status
  });
  return !error;
}

async function get_user_schedule(params) {
  let query = supabase.from('schedule').select('*').eq('user_id', params.user_id);
  if (params.day) query = query.eq('day', params.day);
  const { data } = await query;
  return data;
}

async function insert_multiple_tasks(params) {
  const tasks_list = params.tasks_list || [];
  try {
    for (const task of tasks_list) {
      if (!('user_id' in task && 'title' in task)) throw new Error("Each task must have user_id and title");
    }
    const { data } = await supabase.from('tasks').insert(tasks_list);
    return !!data;
  } catch (err) {
    console.error("Error inserting multiple tasks:", err);
    return false;
  }
}

async function insert_multiple_schedule(params) {
  const schedules_list = params.schedules_list || [];
  try {
    for (const schedule of schedules_list) {
      const required = ['user_id', 'task_id', 'day', 'start_time', 'end_time'];
      if (!required.every(k => k in schedule)) throw new Error(`Each schedule must have ${required}`);
    }
    const { data } = await supabase.from('schedule').insert(schedules_list);
    return !!data;
  } catch (err) {
    console.error("Error inserting multiple schedules:", err);
    return false;
  }
}

async function get_user_tasks_with_schedule(params) {
  const tasks = await get_user_tasks(params.user_id);
  const schedule = await get_user_schedule(params);
  for (const task of tasks) {
    task.schedules = schedule.filter(s => s.task_id === task.id);
  }
  return tasks;
}

async function delete_task(params) {
  const { error } = await supabase.from('tasks').delete()
    .eq('user_id', params.user_id)
    .eq('id', params.task_id);
  return !error;
}

async function update_schedule_status(params) {
  const { error } = await supabase.from('schedule').update({
    status: params.new_status
  })
    .eq('user_id', params.user_id)
    .eq('id', params.schedule_id);
  return !error;
}

// Initialize database
async function initialize_database() {
  for (const table_name of Object.keys(table_dict)) {
    const exists = await tableExists(table_name);
    if (!exists) await createTable(table_name);
  }
}

// Call initialization
initialize_database();

module.exports = {
  tableExists,
  createTable,
  create_user,
  get_user,
  insert_task,
  get_user_tasks,
  insert_schedule,
  insert_multiple_tasks,
  insert_multiple_schedule,
  get_user_tasks_with_schedule,
  delete_task,
  update_schedule_status,
  get_user_schedule
}

// console.log(await get_user_schedule({"user_id": 1, "day": "Sunday"}));
