'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, tokenManager } from '../lib/api-client';
import type { Todo } from '@shared/types';

export default function Index() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const fetchUserTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUserTodos();
      setTodos(response.todos);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch todos';
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        setError('Please log in to view your todos');
        tokenManager.removeToken();
        setIsAuthenticated(false);
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      setError(null);
      await apiClient.createUserTodo({ task: newTask });
      setNewTask('');
      await fetchUserTodos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create todo';
      if (errorMsg.includes('401')) {
        setError('Your session has expired. Please log in again.');
        tokenManager.removeToken();
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleToggleTodo = async (id: number, isDone: boolean) => {
    try {
      setError(null);
      await apiClient.updateUserTodo(id, { isDone: !isDone });
      await fetchUserTodos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update todo';
      if (errorMsg.includes('401')) {
        setError('Your session has expired. Please log in again.');
        tokenManager.removeToken();
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      setError(null);
      await apiClient.deleteUserTodo(id);
      await fetchUserTodos();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete todo';
      if (errorMsg.includes('401')) {
        setError('Your session has expired. Please log in again.');
        tokenManager.removeToken();
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = tokenManager.getToken();
    if (!token) {
      setError('Please log in to view your todos');
      setIsAuthenticated(false);
      setLoading(false);
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
    fetchUserTodos();
  }, [router]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-8">My Todos</h1>

        {/* Create Todo Form */}
        <form onSubmit={handleCreateTodo} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newTask.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Add
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && todos.length === 0 && (
          <div className="text-center py-8 text-slate-600">
            Loading todos...
          </div>
        )}

        {/* Todos List */}
        {!loading && todos.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No todos yet. Create one above!
          </div>
        )}

        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <input
                type="checkbox"
                checked={todo.isDone}
                onChange={() => handleToggleTodo(todo.id, todo.isDone)}
                className="w-5 h-5 text-blue-500 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span
                className={`flex-1 ${
                  todo.isDone
                    ? 'line-through text-slate-400'
                    : 'text-slate-800'
                }`}
              >
                {todo.task}
              </span>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Todo Count */}
        {todos.length > 0 && (
          <div className="mt-4 text-sm text-slate-600">
            {todos.filter((t) => !t.isDone).length} of {todos.length} tasks remaining
          </div>
        )}
      </div>
    </div>
  );
}
