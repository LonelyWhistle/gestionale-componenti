import { User } from './types';

// Hardcoded users for now
const users: User[] = [
  { id: '1', username: 'Olga Orfanelli', password: 'amministrazione' },
  { id: '2', username: 'Gianluca Musumeci', password: 'gianluca0676' },
  { id: '3', username: 'Luca Fadda', password: 'Dw00sjiy' },
  { id: '4', username: 'Giuseppe Marinucci', password: 'alessandro12' },
  { id: '5', username: 'Davide Marinucci', password: 'davide' },
];


export const authenticate = (username: string, password: string): User | null => {
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  return user || null;
};

export const login = (user: User): void => {
  sessionStorage.setItem('currentUser', JSON.stringify(user));
};

export const logout = (): void => {
  sessionStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
  const userJson = sessionStorage.getItem('currentUser');
  if (userJson) {
    try {
      return JSON.parse(userJson) as User;
    } catch (e) {
      console.error("Failed to parse user from sessionStorage", e);
      return null;
    }
  }
  return null;
};
