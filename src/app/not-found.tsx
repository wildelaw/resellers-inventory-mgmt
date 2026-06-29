export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Page not found.</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">Go home</a>
      </div>
    </div>
  );
}