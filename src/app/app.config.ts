import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)],
};

export const environment = {
  apiUrl: 'http://localhost:8080',
  deepseekApiUrl: 'https://api.deepseek.com/chat/completions',
  deepseekApiKey: 'sk-f0081318dd6945b0b7098b552a044af4',
  groupPageSize: 9,
  componentPageSize: 16,
  myApplyPageSize: 5,
  applyReviewPageSize: 9,
  typeOptions: ["list", "bst", "bubble_sort", "quick_sort", "merge_sort",
    "binary_search","bfs","dfs","Dijkstra","Prim","Kruskal",
    "linkedlist","stack","dp_knapsack","traceback_eightqueens",
    "divide_and_conquer_bigInteger_multiply","divide_and_conquer_chessboard","avl","queue"],
  websocketUrl: 'ws://localhost:8080'
}
