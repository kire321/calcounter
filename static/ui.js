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
  stateChanged: false,
  getInitialState: function() {
      return {targetCalories: 2000};
  },
  syncWithServer: function() {
	var body = {};
	if (this.stateChanged) {
		body = {
			update: {
				targetCalories: this.state.targetCalories
			}
		};
		this.stateChanged = false;
	}
    $.ajax({
      url: 'api',
	  type: "POST",
	  processData: false,
      contentType: 'application/json',
	  data: JSON.stringify(body),
      cache: false,
      success: function(data) {
		if (!this.stateChanged) {
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
  onTargetCalorieChange: function(event) {
	  var targetCalories = event.target.value;
	  if (parseInt(targetCalories)) {
		  this.setState({targetCalories: targetCalories});
		  this.stateChanged = true;
	  }
  },
  render: function() {
    return (
      <input type="number" ref="targetCalories" name="targetCalories" value={this.state.targetCalories} onChange={this.onTargetCalorieChange} />
    );
  }
});

React.render(
  <Content />,
  document.getElementById('content')
);
