

var Content = React.createClass({displayName: 'Content',
  getInitialState: function() {
      return {targetCalories: 2000};
  },
  syncWithServer: function(body) {
    $.ajax({
      url: 'api',
	  type: "POST",
	  processData: false,
      contentType: 'application/json',
	  data: JSON.stringify(body),
      cache: false,
      success: function(data) {
        this.setState(data);
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
	  this.setState({targetCalories: targetCalories});
	  this.syncWithServer({
	  	update: {
	  		targetCalories: targetCalories
	  	}
	  });
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
