'use client';

import { useEffect, useState } from 'react';
import { useAuth, SignedIn, SignedOut } from '@clerk/nextjs';
import { apiClient } from '../lib/api-client';
import type { Todo } from '@shared/types';

export default function Index() {
  const { getToken, isSignedIn } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const response = await apiClient.getTodos(token);
      setTodos(response.todos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await apiClient.createTodo({ task: newTask }, token);
      setNewTask('');
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTodo = async (id: number, isDone: boolean) => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) return;

      await apiClient.updateTodo(id, { isDone: !isDone }, token);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) return;

      await apiClient.deleteTodo(id, token);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchTodos();
    }
  }, [isSignedIn]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <SignedOut>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Welcome to Todo App
          </h2>
          <p className="text-slate-600">
            Please sign in to manage your todos
          </p>
        </div>
      </SignedOut>

      <SignedIn>
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
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff] focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newTask.trim()}
                className="px-6 py-3 bg-[#6c47ff] hover:bg-[#5a3de0] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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
                  className="w-5 h-5 text-[#6c47ff] border-slate-300 rounded focus:ring-[#6c47ff] cursor-pointer"
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
      </SignedIn>
    </div>
  );
}