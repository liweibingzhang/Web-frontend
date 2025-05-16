import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './auth/login/login.component'
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './profile/profile.component';
import { StructureGroupListComponent } from './dashboard/structure-group-list/structure-group-list.component';
import { StructureCardGridComponent } from './dashboard/structure-group-list/structure-card-grid/structure-card-grid.component';
import { StructureItemDetailComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-list/structure-component-list.component';
import { ApplyReviewComponent } from './dashboard/apply-review/apply-review.component';
import { BstVisualizerComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-bst/structure-component-bst.component';
import { BubbleSortComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-bubbleSort/structure-component-bubbleSort.component';
import { QuickSortComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-quickSort/structure-component-quickSort.component';
import { MergeSortComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-mergeSort/structure-component-mergeSort.component';
import { BinarySearchComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-binarySearch/structure-component-binarySearch.component';
import { BfsComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-bfs/structure-component-bfs.component';
import { DfsComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-dfs/structure-component-dfs.component';
import { DijkstraComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-dijkstra/structure-component-dijkstra.component';
import { PrimComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-prim/structure-component-prim.component';
import { KruskalComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-kruskal/structure-component-kruskal.component';
import {LinkedListComponent,} from './dashboard/structure-group-list/structure-card-grid/structure-component-linkedlist/structure-component-linkedlist.component';
import {
  StackComponent
} from './dashboard/structure-group-list/structure-card-grid/structure-component-stack/structure-component-stack.component';
import { KnapsackComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-dp-knapsack/structure-component-dp-knapsack.component';
import {TracebackEightqueensComponent} from './dashboard/structure-group-list/structure-card-grid/structure-component-traceback-eightqueens/structure-component-traceback-eightqueens.component';
import{DivideconquerBigintegermultiComponent} from './dashboard/structure-group-list/structure-card-grid/structure-component-divideconquer-bigintegermulti/structure-component-divideconquer-bigintegermulti.component';
import { DivideConquerChessboardComponent } from './dashboard/structure-group-list/structure-card-grid/structure-component-divide-conquer-chessboard/structure-component-divide-conquer-chessboard.component';
import {
  AvlVisualizerComponent
} from './dashboard/structure-group-list/structure-card-grid/structure-component-avl/structure-component-avl.component';
import {
  QueueComponent
} from './dashboard/structure-group-list/structure-card-grid/structure-component-queue/structure-component-queue.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile', component: ProfileComponent },
      { path: 'structure-groups', component: StructureGroupListComponent },
      { path: 'apply-review', component: ApplyReviewComponent},
      {
        path: 'structure-groups/:groupId',
        component: StructureCardGridComponent,
      },
      {
        path: 'structure-groups/:groupId/list/:componentId',
        component: StructureItemDetailComponent,
      },
      {
        path: 'structure-groups/:groupId/bst/:componentId',
        component: BstVisualizerComponent
      },
      {
        path: 'structure-groups/:groupId/bubble_sort/:componentId',
        component: BubbleSortComponent,
      },
      {
        path: 'structure-groups/:groupId/quick_sort/:componentId',
        component: QuickSortComponent,
      },
      {
        path: 'structure-groups/:groupId/merge_sort/:componentId',
        component: MergeSortComponent,
      },
      {
        path: 'structure-groups/:groupId/linkedlist/:componentId',
        component: LinkedListComponent,
      },
      {
        path: 'structure-groups/:groupId/binary_search/:componentId',
        component: BinarySearchComponent,
      },
      {
        path: 'structure-groups/:groupId/bfs/:componentId',
        component: BfsComponent,
      },
      {
        path: 'structure-groups/:groupId/dfs/:componentId',
        component: DfsComponent,
      },
      {
        path: 'structure-groups/:groupId/Dijkstra/:componentId',
        component: DijkstraComponent,
      },
      {
        path: 'structure-groups/:groupId/Prim/:componentId',
        component: PrimComponent,
      },
      {
        path: 'structure-groups/:groupId/Kruskal/:componentId',
        component: KruskalComponent,
      },
      {
        path: 'structure-groups/:groupId/dp_knapsack/:componentId',
        component: KnapsackComponent,
      },
      {
        path: 'structure-groups/:groupId/traceback_eightqueens/:componentId',
        component: TracebackEightqueensComponent,
      },
      {
        path: 'structure-groups/:groupId/divide_and_conquer_bigInteger_multiply/:componentId',
        component: DivideconquerBigintegermultiComponent,
      },
      {
        path: 'structure-groups/:groupId/divide_and_conquer_chessboard/:componentId',
        component: DivideConquerChessboardComponent,
      },

      {
        path: 'structure-groups/:groupId/stack/:componentId',
        component: StackComponent,
      },
      {
        path: 'structure-groups/:groupId/avl/:componentId',
        component: AvlVisualizerComponent,
      },
      {
        path: 'structure-groups/:groupId/queue/:componentId',
        component: QueueComponent,
      }
    ],
  },
  { path: '**', redirectTo: 'login' },
];

export const appRouterProviders = [provideRouter(routes)];

