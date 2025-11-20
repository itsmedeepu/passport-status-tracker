import React, { useState, useMemo, useEffect } from 'react';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  IconButton,
  useMediaQuery,
  Grid,
  Fade,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link
} from '@mui/material';
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  ShieldCheck,
  FileCheck,
  Printer,
  PackageCheck,
  RefreshCw,
  Moon,
  Sun,
  Globe,
  HelpCircle,
  AlertCircle,
  WifiOff,
  FileSearch,
  Users,
  History
} from 'lucide-react';

// --- Configuration ---

const API_ENDPOINT = "https://api2.passportindia.gov.in/v1/online/trackStatusForFileNo";

// Updated Stages to include RPO Review
const STAGES = [
  { id: 1, title: 'Application Submitted', description: 'Application submitted successfully.', icon: FileText },
  { id: 2, title: 'Document Verification', description: 'Documents verified at PSK.', icon: FileCheck },
  { id: 3, title: 'Police Verification', description: 'Pending verification at local station.', icon: ShieldCheck },
  { id: 4, title: 'RPO Review', description: 'Application is under review at Regional Passport Office.', icon: FileSearch },
  { id: 5, title: 'Passport Printing', description: 'Passport is being printed.', icon: Printer },
  { id: 6, title: 'Dispatched', description: 'Passport dispatched via Speed Post.', icon: Truck },
  { id: 7, title: 'Passport Delivered', description: 'Passport delivered to applicant.', icon: PackageCheck },
];

// Helper to determine RPO from File Number prefix
const getRpoName = (fileNo) => {
  if (!fileNo || fileNo.length < 2) return 'Regional Passport Office';
  
  const prefix = fileNo.substring(0, 2).toUpperCase();
  const rpoMap = {
    'AH': 'Ahmedabad',
    'AS': 'Amritsar',
    'BR': 'Bareilly',
    'BN': 'Bengaluru',
    'KA': 'Bengaluru',
    'BH': 'Bhopal',
    'BB': 'Bhubaneswar',
    'CH': 'Chandigarh',
    'MA': 'Chennai',
    'CO': 'Cochin',
    'CB': 'Coimbatore',
    'DD': 'Dehradun',
    'DL': 'Delhi',
    'GZ': 'Ghaziabad',
    'GO': 'Goa',
    'GU': 'Guwahati',
    'HY': 'Hyderabad',
    'JA': 'Jaipur',
    'JL': 'Jalandhar',
    'JM': 'Jammu',
    'CA': 'Kolkata',
    'KO': 'Kolkata',
    'KT': 'Kota',
    'KZ': 'Kozhikode',
    'LU': 'Lucknow',
    'MD': 'Madurai',
    'MU': 'Mumbai',
    'NG': 'Nagpur',
    'PA': 'Patna',
    'PU': 'Pune',
    'RP': 'Raipur',
    'RC': 'Ranchi',
    'SM': 'Shimla',
    'TR': 'Tiruchirappalli',
    'SG': 'Srinagar',
    'SU': 'Surat',
    'TV': 'Trivandrum',
    'VJ': 'Vijayawada',
    'VS': 'Visakhapatnam'
  };

  return rpoMap[prefix] || `RPO (${prefix})`;
};

const getStageFromMsgKey = (key, statusMessage = "") => {
  const normalizedKey = (key || "").toLowerCase();
  const normalizedMsg = (statusMessage || "").toLowerCase();

  // Explicit mapping for keys
  const keyMap = {
    'trackstatus.submitted': 0,
    'trackstatus.granted': 1,
    'trackstatus.police.verification': 2,
    'trackstatus.review': 3, // New mapping for review
    'trackstatus.pre.verification.printed': 4,
    'trackstatus.dispatched': 5,
    'trackstatus.delivered': 6
  };

  if (keyMap[normalizedKey] !== undefined) return keyMap[normalizedKey];

  // Keyword matching based on message content if key is generic or missing
  if (normalizedMsg.includes('delivered')) return 6;
  if (normalizedMsg.includes('dispatched')) return 5;
  if (normalizedMsg.includes('printed') || normalizedMsg.includes('printing')) return 4;
  if (normalizedMsg.includes('review')) return 3; // Catches "Under Review"
  if (normalizedMsg.includes('police')) return 2;
  if (normalizedMsg.includes('submitted')) return 0;
  
  return 2; // Default to mid-process (Police/Verification) if unknown
};

// --- Theme Setup ---

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#60a5fa' : '#2563eb', // Blue 400/600
    },
    secondary: {
      main: mode === 'dark' ? '#34d399' : '#10b981', // Emerald 400/500
    },
    background: {
      default: mode === 'dark' ? '#0f172a' : '#f8fafc', // Slate 900 / Slate 50
      paper: mode === 'dark' ? '#1e293b' : '#ffffff', // Slate 800 / White
    },
    text: {
      primary: mode === 'dark' ? '#f1f5f9' : '#0f172a',
      secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient in dark mode
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: mode === 'dark' ? '#60a5fa' : '#2563eb' },
          '&.Mui-completed': { color: mode === 'dark' ? '#34d399' : '#10b981' },
        },
      },
    },
  },
});

// --- Components ---

const StatusChip = ({ status, label }) => {
  let color = 'default';
  let icon = <Clock size={14} />;

  if (status === 'completed') {
    color = 'success';
    icon = <CheckCircle2 size={14} />;
  } else if (status === 'processing') {
    color = 'primary';
    icon = <RefreshCw size={14} className="animate-spin" />;
  } else if (status === 'rejected') {
    color = 'error';
  }

  return (
    <Chip
      label={label}
      color={color}
      icon={icon}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};

// --- Main App ---

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visitorCount, setVisitorCount] = useState(12450); // Initial fake count
  const [helpOpen, setHelpOpen] = useState(false); // State for help dialog

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Help Dialog Handlers
  const handleHelpOpen = () => {
    setHelpOpen(true);
  };

  const handleHelpClose = () => {
    setHelpOpen(false);
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Simulate visitor count increment on load
    const randomIncrement = Math.floor(Math.random() * 15);
    setVisitorCount(prev => prev + randomIncrement);

    return () => clearInterval(timer);
  }, []);

  const [fileNumber, setFileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [corsWarning, setCorsWarning] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!fileNumber) {
      setError('Please enter a File Number.');
      return;
    }

    // Update Recent Searches (Keep only last 2 unique)
    setRecentSearches(prev => {
      const newHistory = [fileNumber, ...prev.filter(f => f !== fileNumber)];
      return newHistory.slice(0, 2);
    });

    setLoading(true);
    setError('');
    setResult(null);
    setCorsWarning(false);

    try {
      // Constructing the request payload as specified
      const payload = {
        requestResponseMap: {
          fileNo: fileNumber,
          optStatus: "Ordinary"
        }
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const jsonResponse = await response.json();

      if (jsonResponse.strReturnString !== "success" || !jsonResponse.requestResponseMap) {
        throw new Error("Invalid response from server or file number not found.");
      }

      const dataMap = jsonResponse.requestResponseMap;
      const appStatus = dataMap.applicationStatus ? dataMap.applicationStatus[0] : {};
      
      // Determine Status Message
      const statusMsg = dataMap.statusMessage || appStatus.STATUS_MESSAGE || "";

      // Parsing logic based on the API structure
      const stageIndex = getStageFromMsgKey(dataMap.msgKey || appStatus.TXT_MSG_KEY, statusMsg);
      const rpoName = getRpoName(dataMap.fileNo);
      
      const fullName = appStatus.APPL_GIVEN_NAME 
        ? `${appStatus.APPL_GIVEN_NAME} ${appStatus.APPL_SURNAME || ''}` 
        : 'Applicant';

      setResult({
        applicantName: fullName,
        fileNumber: dataMap.fileNo,
        applicationDate: appStatus.APP_SUB_DATE || 'N/A',
        type: appStatus.PARAM_VALUE || 'Normal',
        rpo: rpoName,
        currentStageIndex: stageIndex,
        status: 'processing',
        statusMessage: statusMsg
      });

    } catch (err) {
      console.error("Tracking Error:", err);
      setError(err.message);
      
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setCorsWarning(true);
        setError("Connection failed. This is likely a CORS restriction because we are calling the government API directly from the browser. To fix this, use a backend proxy or a CORS extension.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setResult(null);
    setFileNumber('');
    setError('');
    setCorsWarning(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="sticky" color="inherit" sx={{ 
        backdropFilter: 'blur(20px)', 
        backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        boxShadow: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Container maxWidth="md">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <Globe size={20} />
              </Avatar>
              <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1 }}>
                Passport<Box component="span" sx={{ color: 'primary.main' }}>Track</Box>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: 'text.secondary',
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                {currentTime.toLocaleTimeString()}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={toggleColorMode} color="inherit">
                  {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </IconButton>
                <IconButton 
                  color="inherit" 
                  onClick={handleHelpOpen}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  <HelpCircle size={20} />
                </IconButton>
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={handleHelpClose}>
        <DialogTitle>Help & Support</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Any querys please refer offical website. Passport Seva
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHelpClose} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="md" sx={{ py: 6, pb: 6, minHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Content Wrapper to push footer down */}
        <Box sx={{ flex: 1 }}>
          {/* Search Section */}
          <Fade in={!result} unmountOnExit>
            <Box sx={{ display: !result ? 'block' : 'none' }}>
              <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h4" gutterBottom>
                  Track Your Application
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Real-time updates on your passport application status.
                </Typography>
              </Box>

              <Paper elevation={3} sx={{ p: 4, maxWidth: 480, mx: 'auto', border: 1, borderColor: 'divider' }}>
                <form onSubmit={handleTrack}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="File Number"
                      placeholder="e.g., BNT1234567890"
                      fullWidth
                      value={fileNumber}
                      onChange={(e) => setFileNumber(e.target.value)}
                      InputProps={{
                        startAdornment: <Box sx={{ mr: 1, color: 'text.secondary', display: 'flex' }}><FileText size={20} /></Box>,
                        sx: { textTransform: 'uppercase' }
                      }}
                    />

                    {/* Recent Searches Chips */}
                    {recentSearches.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                          <History size={14} />
                          <Typography variant="caption">Recent:</Typography>
                        </Box>
                        {recentSearches.map((item, index) => (
                          <Chip 
                            key={index}
                            label={item}
                            size="small"
                            onClick={() => setFileNumber(item)}
                            sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                            variant="outlined"
                            clickable
                          />
                        ))}
                      </Box>
                    )}
                    
                    {error && (
                      <Alert severity="error" icon={<AlertCircle size={20} />}>
                        {error}
                      </Alert>
                    )}
                    
                    {corsWarning && (
                      <Alert severity="warning" icon={<WifiOff size={20} />}>
                        <strong>CORS Restriction Detected:</strong> The browser blocked the request to <em>passportindia.gov.in</em>. This is a security feature of modern browsers. To make this work, this code must run on a server or use a proxy.
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      variant="contained" 
                      size="large" 
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search size={20} />}
                      sx={{ py: 1.5 }}
                    >
                      {loading ? 'Fetching Data...' : 'Track Status'}
                    </Button>
                  </Box>
                </form>
              </Paper>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 3, color: 'text.secondary', typography: 'body2' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ShieldCheck size={16} /> Official API
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={16} /> Live Status
                </Box>
              </Box>
            </Box>
          </Fade>

          {/* Results Section */}
          <Fade in={!!result} unmountOnExit>
            <Box sx={{ display: !!result ? 'block' : 'none' }}>
              <Button 
                onClick={resetSearch} 
                startIcon={<span style={{ fontSize: '1.2rem' }}>←</span>} 
                sx={{ mb: 3 }}
              >
                Track another application
              </Button>

              <Grid container spacing={3}>
                {/* Main Status Card */}
                <Grid item xs={12}>
                  <Card elevation={2} sx={{ border: 1, borderColor: 'divider' }}>
                    <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'grey.50' }}>
                      <Box>
                        <Typography variant="h5" gutterBottom>
                          {result?.applicantName}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FileText size={14} /> {result?.fileNumber}
                          </Typography>
                          <Divider orientation="vertical" flexItem />
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MapPin size={14} /> {result?.rpo}
                          </Typography>
                        </Box>
                      </Box>
                      <StatusChip 
                        status={result?.status || 'processing'} 
                        label={result?.status === 'completed' ? 'Completed' : 'Processing'} 
                      />
                    </Box>
                    
                    {result?.statusMessage && (
                      <Alert severity="info" icon={<RefreshCw className="animate-spin" size={20}/>} sx={{ borderRadius: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Latest Update</Typography>
                          <Typography variant="body2">{result.statusMessage}</Typography>
                      </Alert>
                    )}

                    <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, py: 3 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Application Type</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>{result?.type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Date Applied</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>{result?.applicationDate}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Est. Completion</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>Within 7 Days</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Timeline Stepper */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      Application Timeline
                    </Typography>
                    
                    <Stepper activeStep={result?.currentStageIndex} orientation="vertical">
                      {STAGES.map((stage, index) => {
                        const Icon = stage.icon;
                        return (
                          <Step key={stage.id} expanded={true}>
                            <StepLabel 
                              StepIconComponent={() => (
                                <Box sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  bgcolor: index < result?.currentStageIndex ? 'success.main' : index === result?.currentStageIndex ? 'primary.main' : 'action.disabledBackground',
                                  color: (index <= result?.currentStageIndex) ? 'common.white' : 'text.disabled'
                                }}>
                                  <Icon size={18} />
                                </Box>
                              )}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: index === result?.currentStageIndex ? 700 : 500 }}>
                                {stage.title}
                              </Typography>
                            </StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {stage.description}
                              </Typography>
                              {index === result?.currentStageIndex && (
                                <Box sx={{ mt: 2 }}>
                                  <Chip label="Current Stage" size="small" color="primary" variant="outlined" />
                                </Box>
                              )}
                            </StepContent>
                          </Step>
                        );
                      })}
                    </Stepper>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </Box>

        {/* Visitor Counter Footer */}
        <Box sx={{ mt: 8, py: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Users size={16} />
            Visitors: {visitorCount.toLocaleString()}
          </Typography>

          {/* Disclaimer */}
          <Typography variant="body2" color="warning.main" sx={{ mt: 2, maxWidth: 500, mx: 'auto', fontSize: '0.75rem', fontWeight: 500 }}>
            Note: This is not the official website of passport. This is only for information purpose. Please refer to the official website for more details.
          </Typography>

          {/* Designed by */}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
            Website designed by <Link href="https://github.com/itsmedeepu" target="_blank" rel="noopener noreferrer" color="inherit" sx={{ textDecoration: 'underline' }}>https://github.com/itsmedeepu</Link>
          </Typography>

          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
            &copy; {new Date().getFullYear()} PassportTrack. Not affiliated with the Govt.
          </Typography>
        </Box>
        
      </Container>
    </ThemeProvider>
  );
}