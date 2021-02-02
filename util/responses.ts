const success = (result: any = null) => {
  return {
    success: 1,
    message: "NO_ERROR",
    errors: null,
    result
  };
};

const error = (err: { code: any; message: any; err: any }, result: any = null) => {
  return {
    success: err.code,
    message: err.message,
    errors: err.err,
    result
  };
};

export { success, error };
