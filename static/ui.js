function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

var Meal = React.createClass({
	render: function () {
		var meal = this.props.meal;
		var time = (new Date(0, 0, meal.date, 0, 0, meal.time)).toString()
		return (
			<div className="meal" key={meal.mealID}>
				<b> At </b> {time} <b> I ate </b>
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
  render: function() {
	  var self = this;
	var meals = this.state.meals.map(function (meal) {
		var onDescriptionChange = self.onChangeFactory(meal, "description");
		var onCaloriesChange = self.onChangeFactory(meal, "calories");
		var onDelete = self.onDeleteFactory(meal);
		return (
			<Meal meal={meal} onDescriptionChange={onDescriptionChange} onCaloriesChange={onCaloriesChange} onDelete={onDelete} />
			);
	});
    return (
	  <div className="content">
		  <div className="header">
			  <div className="targetCalories">
				  Daily target calories:
				  <input type="number" ref="targetCalories" name="targetCalories" value={this.state.targetCalories} onChange={this.onTargetCalorieChange} />
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
