# Redux Persist & Redux Thunk -- Complete Implementation Guide

This document explains **Redux Persist** and **Redux Thunk** in detail,
covering: - Why we use them - How they work internally - Step-by-step
implementation - Real-world flow examples - Best practices

------------------------------------------------------------------------

## 1. Why Redux Needs Middleware & Persistence

Redux by default: - Stores state **only in memory** - Loses all data on
**page refresh** - Cannot handle **async logic** directly

To solve this: - **Redux Thunk** → Handles async logic (API calls) -
**Redux Persist** → Saves Redux state to storage

------------------------------------------------------------------------

# PART A: REDUX THUNK

## 2. What is Redux Thunk?

Redux Thunk is a **middleware** that allows you to: - Dispatch
**functions instead of plain objects** - Perform **asynchronous
operations** - Dispatch actions **after API responses**

### Without Thunk ❌

    dispatch({ type: 'FETCH_USERS' })

### With Thunk ✅

    dispatch(fetchUsers())

Where `fetchUsers` is a function.

------------------------------------------------------------------------

## 3. Why Use Redux Thunk?

-   Handle API calls
-   Delay dispatch
-   Conditional dispatch
-   Cleaner separation of logic

Used in: - Login flows - Fetching dashboards - Submitting forms

------------------------------------------------------------------------

## 4. How Redux Thunk Works (Internals)

    Component
       ↓
    dispatch(thunkFunction)
       ↓
    Thunk Middleware intercepts
       ↓
    Executes function(dispatch, getState)
       ↓
    Async API call
       ↓
    Dispatch SUCCESS / FAILURE

------------------------------------------------------------------------

## 5. Installing Redux Thunk

    npm install redux-thunk

------------------------------------------------------------------------

## 6. Implementing Redux Thunk (Step-by-Step)

### Step 1: Create Async Action

    export const fetchUsers = () => {
      return async (dispatch) => {
        dispatch({ type: 'USERS_REQUEST' })

        try {
          const res = await fetch('/api/users')
          const data = await res.json()

          dispatch({ type: 'USERS_SUCCESS', payload: data })
        } catch (err) {
          dispatch({ type: 'USERS_FAILURE', error: err })
        }
      }
    }

------------------------------------------------------------------------

### Step 2: Reducer

    const initialState = {
      loading: false,
      users: [],
      error: null
    }

    export const usersReducer = (state = initialState, action) => {
      switch (action.type) {
        case 'USERS_REQUEST':
          return { ...state, loading: true }

        case 'USERS_SUCCESS':
          return { ...state, loading: false, users: action.payload }

        case 'USERS_FAILURE':
          return { ...state, loading: false, error: action.error }

        default:
          return state
      }
    }

------------------------------------------------------------------------

### Step 3: Store Configuration

    import { createStore, applyMiddleware } from 'redux'
    import thunk from 'redux-thunk'
    import rootReducer from './reducers'

    const store = createStore(
      rootReducer,
      applyMiddleware(thunk)
    )

    export default store

------------------------------------------------------------------------

## 7. Redux Thunk Best Practices

-   Keep API logic inside thunks
-   Dispatch REQUEST / SUCCESS / FAILURE
-   Avoid heavy logic in components
-   Use getState() only when needed

------------------------------------------------------------------------

# PART B: REDUX PERSIST

## 8. What is Redux Persist?

Redux Persist: - Saves Redux state to storage - Automatically rehydrates
state on reload

Supported storage: - localStorage (web) - sessionStorage - AsyncStorage
(React Native)

------------------------------------------------------------------------

## 9. Why Use Redux Persist?

-   Keep user logged in
-   Persist tokens
-   Save UI preferences
-   Offline support

------------------------------------------------------------------------

## 10. How Redux Persist Works

    Redux Store
       ↓
    Persist Middleware
       ↓
    localStorage
       ↓
    Page Reload
       ↓
    Rehydrate Store

------------------------------------------------------------------------

## 11. Installing Redux Persist

    npm install redux-persist

------------------------------------------------------------------------

## 12. Implement Redux Persist (Step-by-Step)

### Step 1: Persist Configuration

    import { persistStore, persistReducer } from 'redux-persist'
    import storage from 'redux-persist/lib/storage'

    const persistConfig = {
      key: 'root',
      storage,
      whitelist: ['auth']
    }

------------------------------------------------------------------------

### Step 2: Wrap Root Reducer

    const persistedReducer = persistReducer(persistConfig, rootReducer)

------------------------------------------------------------------------

### Step 3: Create Store

    const store = createStore(
      persistedReducer,
      applyMiddleware(thunk)
    )

    const persistor = persistStore(store)

    export { store, persistor }

------------------------------------------------------------------------

### Step 4: Wrap App Component

    import { PersistGate } from 'redux-persist/integration/react'

    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>

------------------------------------------------------------------------

## 13. Clearing Persisted State (Logout)

    persistor.purge()

Or reducer-based:

    case 'LOGOUT':
      return initialState

------------------------------------------------------------------------

## 14. Redux Persist Best Practices

-   Persist only required slices
-   Never persist sensitive data (passwords)
-   Clear store on logout
-   Version your persisted state

------------------------------------------------------------------------

# PART C: REDUX THUNK + REDUX PERSIST TOGETHER

## 15. Combined Flow Example

    User Login
       ↓
    Thunk API Call
       ↓
    Store token in Redux
       ↓
    Redux Persist saves token
       ↓
    Page Reload
       ↓
    User still logged in

------------------------------------------------------------------------

## 16. Common Use Cases

  Feature            Thunk   Persist
  ------------------ ------- ---------
  API calls          ✅      ❌
  Async logic        ✅      ❌
  Save state         ❌      ✅
  Auth persistence   ❌      ✅

------------------------------------------------------------------------

## 17. When NOT to Use Them

-   Very small apps → Overkill
-   Server-side state only → Persist unnecessary
-   Heavy async logic → Prefer Redux Toolkit / RTK Query

------------------------------------------------------------------------

## 18. Conclusion

-   **Redux Thunk** handles async business logic
-   **Redux Persist** ensures state survival
-   Together they enable **robust production-ready apps**

------------------------------------------------------------------------

End of Document
