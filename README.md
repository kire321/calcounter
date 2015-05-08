# calcounter

an application for the input of calories

User must be able to create an account and log in

When logged in, user can see a list of his meals and calories (user
enters calories manually, no auto calculations!), also hw should be
able to edit and delete

Each entry has a date, time, text, and num of calories

Filter by dates from-to, time from-to (e.g. how much calories have I
had for lunch each day in the last month, if lunch is between 12 and
15h)

User setting – Expected number of calories per day

When displayed, it goes green if the total for that day is less than
expected number of calories per day, otherwise goes red

##Architecture

Basic three tier architecture -- client, webserver, database

Since calCounter targets a single platform--the web--we put as much business logic as possible on the client side. The webserver will only authenticate DB operations.

###Client

Let `Meal = tuple(id, date, time, description, calories)` and`State = tuple(daily_calories, list(meal))`. The `id`s are just random numbers and can generated by the client.

The client keeps one instance of `State`: `state`. When `state` changes, React updates the UI. The client notifies the server of state changes in the background, and also polls. The server always sends `reply`, which is a `State`, and whenever the server replies the client sets `state = reply`.

If the client cannot receive replies from the user (perhaps there is an internet connectivity problem), the user can still edit their local state. It can diverge arbitrarily from the server's state. When connectivity is reestablished, server changes will clobber all local changes. This is a bug, but fixing it is out of scope.

If the client attempts an impossible operation (deleting a nonexistant item, creating two meals with the same timestamp, etc) the server doesn't perform the operation and sends the latest state with a status 200 OK. This would be a confusing public API, but for internal purposes is ok.

If the user makes two changes right after each other, the second change may briefly disappear from the UI, when the server has acknowledged the first change but not the second. The second change will reappear when the second ack is received. This is a bug, but fixing it is out of scope.

If the user adds a new meal that doesn't meet the current date/time filters, that meal will be visible on the UI until the server acks the changes, and then it will disappear from the UI. This is a bug, but fixing it is out of scope.

Scrolling is impossible: users always see the first `n` items that match the filters. This is a bug, but fixing it is out of scope.

###Server

There is one endpoint, and it speaks json:
- input:  (All parameters are optional.)
  - (user id, from session cookie)
  - minimum date
  - maximum date
  - minimum time
  - maximum time
  - update operation. Must be one of:
    - set target daily calories
    - upsert a `Meal`
    - delete a `Meal` (pass the ID)
- output:
  - (HTTP status)
  - list of tuples that match the filters
  - target daily calories

The api will be accessible by either passport.js session cookie or http basic auth. I expect it will be easier to also allow access to the APIs with HTTP basic auth than debugging deep dark cookie magic in the test scripts.

###DynamoDB Schema

User metadata table:
- Hash key: user id
- Ordinary field: Target daily calories

User data table:
- Hash key: user id
- Range key: meal id
- Secondary local index: date
- Ordinary field: time
- Ordinary field: description
- Ordinary field: num calories

We can delete items by id in constant time, and can query the most recent items also in constant time. We can also filter by time of day, and this will be linear in the size of the time range we have to look through to get enough items. This slowness is algorithmic, we can't eliminate it by changing database technologies (though some DBs won't tell you about it).

##Shopping for libraries and technologies

- Database: DynamoDB. Using DynamoDB is totally managed and impossible to kill. It is very honest, and exposes the inherent limitations of databases to the programmer.
- Webserver: I want to try koa and ES6. The most important middlewares from express have been ported to koa, so it should be mature enough. Elastic Beanstalk is the most managed way to run ES6 code on AWS. With a quick read through the documentation, it seems to be equivalent to heroku. 
- Client: I want to try React/JSX. React has an excellent reputation and I didn't really look at alternatives.

##Development plan

1. functional test: a test script gets back "hello world" from EBS
  - get koa working locally
  - deploy to EBS with the `--harmony` flag
1. functional test: A test script authenticates with HTTP basic auth to see "hello world"
  - introduce basic auth middleware
  - (http basic auth is assumed for all future functional tests)
1. user story: I log in with my facebook account, and see "hello world"
  - introduce passport middleware
  - (facebook auth is assumed for all future user stories)
1. functional test: A test script changes the target daily calories of a user
  - api for ddb upserts
1. user story: I log in with my facebook account, and can change daily target calories.
  - (first client-side js)
  - JSX integrated into build process
  - sync textbox state with server state using React
1. milestone: authenticated storage of one number
1. functional test: A test script can upsert and delete items from the DB.
1. user story: I can see a table of (meal, date, time, calories)-tuples, and edit (add new items, modify existing items, delete existing items) it smoothly. Changes are synced to the server in the background. My target daily calories is still visible somewhere.
  - Dummy data rendered with React
  - Dummy data is editable
  - existing meals editable
  - can add new meals
  - can delete existing meals
  - Syncing with server
    - error handling
1. user story: I see a UI that is not horribly ugly.
  - introduce bootstrap
1. user story: items are colored green/red based on daily calories
1. functional test: test script can filter by date and time
1. user story: I can filter based on date and time
