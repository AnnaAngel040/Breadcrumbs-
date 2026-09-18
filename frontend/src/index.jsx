import { AppRegistry } from 'react-native';
import App from './App';

// Register the React Native application
AppRegistry.registerComponent('App', () => App);

// Run the application on the web root
AppRegistry.runApplication('App', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
