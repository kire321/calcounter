function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

var Meal = React.createClass({
	render: function () {
		var meal = this.props.meal;
		//The unix epoch is January 1st, 1970
		var time = (new Date(1970, 0, meal.date + 1, 0, 0, meal.time)).toString();
		var color = "#55FF55";
		if (this.props.tooManyCalories) {
			color = "#FF5555";
		}
		return (
			<div className="meal" key={meal.mealID} style={{'background-color': color}}l>
				<b> At </b> {time} (which is day {meal.date} and time {meal.time}) <b> I ate </b>
				<input type="text" ref="description" name="description" value={meal.description} onChange={this.props.onDescriptionChange} />
				<b> which had </b>
				<input type="number" ref="calories" name="calories" value={meal.calories} onChange={this.props.onCaloriesChange} />
				<b> calories. </b>
			  <button type="button" onClick={this.props.onDelete}>Delete</button> 
				<br />
			</div>
			)
	}
});


var Content = React.createClass({
  displayName: 'Content',
	//This boolean is a sort of write permission lock
	//if true, the user is actively editing in this tab, we send sync
	//changes to the server every two seconds, but ignore the reply in
	//case the user has made more changes in the mean time. local
	//state wins.
	//
	//if false, this tab just polls in case the state has been
	//modified in another tab. server state wins.
	//
	//we're not building google docs. We don't care what happens if
	//somebody edits their data from two different tabs, switching
	//back and forth more than every two seconds.
  stateChanges: {},
  getInitialState: function() {
      return {
		  targetCalories: 2000,
		  meals: [ ]
	  };
  },
  syncWithServer: function() {
	var body = this.stateChanges;
	this.stateChanges = {};
	if (body.upserts) {
		body.upserts = [];
		for (var id in this.upserts) {
			body.upserts.push(this.upserts[id]);
		}
		this.upserts = {};
	}
	body.minDate = this.state.minDate;
	body.maxDate = this.state.maxDate;
	body.minTime = this.state.minTime;
	body.maxTime = this.state.maxTime;
    $.ajax({
      url: 'api',
	  type: "POST",
	  processData: false,
      contentType: 'application/json',
	  data: JSON.stringify(body),
      cache: false,
      success: function(data) {
		if (Object.keys(this.stateChanges).length === 0) {
			//User is not active here, server state wins
			this.setState(data);
		}
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function() {
	  this.syncWithServer();
	  setInterval(this.syncWithServer, 2000);
  },
	onChangeFactory: function (meal, attr) {
		var self = this;
		return function (event) {
			meal[attr] = event.target.value;
			self.upsert(meal);
			self.setState(self.state);
		};
	},


  onTargetCalorieChange: function(event) {
	  var targetCalories = event.target.value;
	  if (parseInt(targetCalories)) {
		  this.state.targetCalories = targetCalories;
		  this.stateChanges.targetCalories = targetCalories;
		  this.setState(this.state);
	  }
  },
  upserts: {},
	//keep only the last upsert for each id
  upsert: function(meal) {
	this.stateChanges.upserts = true;
	this.upserts[meal.id] = meal;
  },
  createMeal: function() {
	  var timestamp = Math.floor(Date.now() / 1000); 
	  //if somebody updates their calories during a leap second we're
	  //screwed
	  var oneDay = 60 * 60 * 24;
	  var date = Math.floor(timestamp / oneDay);
	  var time = timestamp - (date * oneDay);
	  var meal = {
		  mealID: randomInt(0, 1000000),
		  date: date,
		  time: time,
		  description: "",
		  calories: 1000
	  };
	  this.state.meals.push(meal);
	  this.upsert(meal);
	  this.setState(this.state);
  },
  onDeleteFactory: function(meal) {
	  var self = this;
	  return function() {
		  if (!self.stateChanges.deletes) {
			  self.stateChanges.deletes = [];
		  }
		  self.stateChanges.deletes.push(meal.mealID);
		 var index = self.state.meals.indexOf(meal); 
		if (index > -1) {
			self.state.meals.splice(index, 1);
		}
		self.setState(self.state);
	  };
  },
  onFilterChangeFactory: function(attr) {
	  var self = this;
	  return function(event) {
		  self.state[attr] = event.target.value;
		  self.setState(self.state);
	  };
  },
  render: function() {
	var self = this;
	var days = {};
	this.state.meals.forEach(function(meal) {
		if (!days[meal.date]) {
		  days[meal.date] = 0;
		}
		days[meal.date] += meal.calories;
	});
	var filteredMeals = this.state.meals.filter(function (meal) {
		var ok1 = !self.state.minDate || self.state.minDate <= meal.date;
		var ok2 = !self.state.maxDate || self.state.maxDate >= meal.date;
		var ok3 = !self.state.minTime || self.state.minTime <= meal.time;
		var ok4 = !self.state.maxTime || self.state.maxTime >= meal.time;
		return ok1 && ok2 && ok3 && ok4;
	});
	var meals = filteredMeals.map(function (meal) {
		var onDescriptionChange = self.onChangeFactory(meal, "description");
		var onCaloriesChange = self.onChangeFactory(meal, "calories");
		var onDelete = self.onDeleteFactory(meal);
		var tooManyCalories = days[meal.date] > self.state.targetCalories;
		return (
			<Meal meal={meal} onDescriptionChange={onDescriptionChange} onCaloriesChange={onCaloriesChange} onDelete={onDelete} tooManyCalories={tooManyCalories} />
			);
	});
    return (
	  <div className="content">
		  <div className="header">
			  <div className="targetCalories">
				  Daily target calories:
				  <input type="number" value={this.state.targetCalories} onChange={this.onTargetCalorieChange} />
				  <br /><b>Filters</b>   
				  &emsp;minimum date: <input type="number" value={this.state.minDate} onChange={this.onFilterChangeFactory("minDate")} />
				  &emsp;maximum date: <input type="number" value={this.state.maxDate} onChange={this.onFilterChangeFactory("maxDate")} />
				  &emsp;minimum time: <input type="number" value={this.state.minTime} onChange={this.onFilterChangeFactory("minTime")} />
				  &emsp;maximum time: <input type="number" value={this.state.maxTime} onChange={this.onFilterChangeFactory("maxTime")} />
				  <br />
			  </div>
			  <button type="button" onClick={this.createMeal}>New Meal</button> 
		  </div>
		  <div className="meals">
			{meals}
		  </div>
	  </div> 
    );
  }
});

React.render(
  <Content />,
  document.getElementById('content')
);
